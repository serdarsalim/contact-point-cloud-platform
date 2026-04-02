import { Prisma, TemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden } from "@/lib/http";
import { readBody } from "@/lib/request";
import { createTemplate, listTemplates, reorderTemplates } from "@/lib/services/template-service";
import { writeAuditLog } from "@/lib/services/audit-service";

function parseTemplateType(value: string | null): TemplateType | undefined {
  if (!value) return undefined;
  if (!Object.values(TemplateType).includes(value as TemplateType)) return undefined;
  return value as TemplateType;
}

function resolveOrganizationId(
  user: Awaited<ReturnType<typeof requireSessionUser>>["user"],
  requestedOrgId?: string | null
) {
  if (!user) return null;

  if (requestedOrgId) {
    if (!canAccessOrganization(user, requestedOrgId)) {
      return null;
    }
    return requestedOrgId;
  }

  if (isSuperadmin(user)) {
    return null;
  }

  return getDefaultOrganizationId(user);
}

export async function GET(request: Request) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const url = new URL(request.url);
  const orgId = resolveOrganizationId(auth.user, url.searchParams.get("orgId"));
  const type = parseTemplateType(url.searchParams.get("type"));

  if (!orgId) {
    return badRequest("Provide orgId, or ensure you are an org admin");
  }

  const templates = await listTemplates({ organizationId: orgId, type });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readBody(request);

  const organizationId = String(body.organizationId || "").trim() || getDefaultOrganizationId(auth.user);
  const name = String(body.name || "").trim();
  const type = String(body.type || "").toUpperCase();
  const subject = body.subject ? String(body.subject) : null;
  const bodyText = String(body.body || "");
  const imageAssetId = body.imageAssetId ? String(body.imageAssetId) : null;
  const imageAlt = body.imageAlt ? String(body.imageAlt) : null;

  if (!organizationId) {
    return badRequest("organizationId is required");
  }

  if (!canAccessOrganization(auth.user, organizationId)) {
    return forbidden();
  }

  if (!name || !bodyText || !Object.values(TemplateType).includes(type as TemplateType)) {
    return badRequest("organizationId, type, name, body are required");
  }

  try {
    const template = await createTemplate({
      organizationId,
      type: type as TemplateType,
      name,
      subject,
      body: bodyText,
      imageAssetId,
      imageAlt
    });

    await writeAuditLog({
      organizationId,
      actorUserId: auth.user.id,
      action: "template.created",
      entityType: "Template",
      entityId: template.id,
      metadata: { type: template.type, name: template.name }
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("Template name must be unique within organization + type");
    }

    throw error;
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readBody(request);
  const organizationId = String(body.organizationId || "").trim() || getDefaultOrganizationId(auth.user);
  const type = String(body.type || "").toUpperCase();
  const orderedTemplateIds = Array.isArray(body.orderedTemplateIds)
    ? body.orderedTemplateIds.map((value: unknown) => String(value))
    : null;

  if (!organizationId) {
    return badRequest("organizationId is required");
  }

  if (!canAccessOrganization(auth.user, organizationId)) {
    return forbidden();
  }

  if (!Object.values(TemplateType).includes(type as TemplateType)) {
    return badRequest("type must be EMAIL, WHATSAPP, or NOTE");
  }

  if (!orderedTemplateIds || orderedTemplateIds.length === 0) {
    return badRequest("orderedTemplateIds are required");
  }

  try {
    const templates = await reorderTemplates({
      organizationId,
      type: type as TemplateType,
      orderedTemplateIds
    });

    await writeAuditLog({
      organizationId,
      actorUserId: auth.user.id,
      action: "template.reordered",
      entityType: "TemplateOrder",
      metadata: {
        type,
        orderedTemplateIds
      }
    });

    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    throw error;
  }
}
