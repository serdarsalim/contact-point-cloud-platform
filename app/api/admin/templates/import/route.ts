import { TemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { badRequest, forbidden } from "@/lib/http";
import { readBody } from "@/lib/request";
import { writeAuditLog } from "@/lib/services/audit-service";
import { createTemplate } from "@/lib/services/template-service";

type ExtensionTemplateRecord = {
  name?: unknown;
  subject?: unknown;
  body?: unknown;
};

type ExtensionImportPayload = {
  emailTemplates?: ExtensionTemplateRecord[];
  whatsappTemplates?: ExtensionTemplateRecord[];
  noteTemplates?: ExtensionTemplateRecord[];
};

type NormalizedImportTemplate = {
  name: string;
  subject: string | null;
  body: string;
};

function normalizeTemplateRecord(record: ExtensionTemplateRecord | null | undefined) {
  if (!record || typeof record !== "object") return null;
  const name = String(record.name || "").trim();
  const body = String(record.body || "");
  const subject = record.subject == null ? null : String(record.subject);
  if (!name || !body.trim()) return null;
  return { name, subject, body };
}

function toImportList(payload: ExtensionImportPayload, type: TemplateType): NormalizedImportTemplate[] {
  const source =
    type === "EMAIL"
      ? payload.emailTemplates
      : type === "WHATSAPP"
        ? payload.whatsappTemplates
        : payload.noteTemplates;

  return Array.isArray(source)
    ? source
        .map((item) => normalizeTemplateRecord(item))
        .filter((item): item is NormalizedImportTemplate => Boolean(item))
    : [];
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readBody(request);
  const organizationId = String(body.organizationId || "").trim() || getDefaultOrganizationId(auth.user);
  const payload = body.payload as ExtensionImportPayload | undefined;

  if (!organizationId) {
    return badRequest("organizationId is required");
  }

  if (!canAccessOrganization(auth.user, organizationId)) {
    return forbidden();
  }

  if (!payload || typeof payload !== "object") {
    return badRequest("A valid extension template export payload is required");
  }

  const emailTemplates = toImportList(payload, "EMAIL");
  const whatsappTemplates = toImportList(payload, "WHATSAPP");
  const noteTemplates = toImportList(payload, "NOTE");
  const templatesToImport = [
    ...emailTemplates.map((template) => ({ ...template, type: "EMAIL" as const })),
    ...whatsappTemplates.map((template) => ({ ...template, type: "WHATSAPP" as const, subject: null })),
    ...noteTemplates.map((template) => ({ ...template, type: "NOTE" as const, subject: null }))
  ];

  if (!templatesToImport.length) {
    return badRequest("No valid templates were found in the import file");
  }

  const existingTemplates = await prisma.template.findMany({
    where: { organizationId },
    select: { id: true, type: true, name: true }
  });
  const existingMap = new Map(existingTemplates.map((template) => [`${template.type}::${template.name}`, template.id]));

  let created = 0;
  let updated = 0;

  for (const template of templatesToImport) {
    const key = `${template.type}::${template.name}`;
    const existingId = existingMap.get(key);

    if (existingId) {
      await prisma.template.update({
        where: { id: existingId },
        data: {
          subject: template.type === "EMAIL" ? template.subject : null,
          body: template.body
        }
      });
      updated += 1;
      continue;
    }

    const createdTemplate = await createTemplate({
      organizationId,
      type: template.type,
      name: template.name,
      subject: template.type === "EMAIL" ? template.subject : null,
      body: template.body
    });
    existingMap.set(key, createdTemplate.id);
    created += 1;
  }

  await writeAuditLog({
    organizationId,
    actorUserId: auth.user.id,
    action: "template.imported_from_extension",
    entityType: "TemplateImport",
    metadata: {
      created,
      updated,
      emailCount: emailTemplates.length,
      whatsappCount: whatsappTemplates.length,
      noteCount: noteTemplates.length
    }
  });

  return NextResponse.json({
    ok: true,
    created,
    updated,
    total: templatesToImport.length
  });
}
