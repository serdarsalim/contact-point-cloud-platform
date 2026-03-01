import { Prisma, TemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization } from "@/lib/auth/rbac";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { readBody } from "@/lib/request";
import { prisma } from "@/lib/db";
import { deleteTemplate, updateTemplate } from "@/lib/services/template-service";
import { writeAuditLog } from "@/lib/services/audit-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const { templateId } = await params;

  const existing = await prisma.template.findUnique({
    where: { id: templateId }
  });

  if (!existing) {
    return notFound("Template not found");
  }

  if (!canAccessOrganization(auth.user, existing.organizationId)) {
    return forbidden();
  }

  const body = await readBody(request);
  const type = body.type ? String(body.type).toUpperCase() : undefined;
  const subject =
    body.subject === undefined ? undefined : body.subject === null || body.subject === "" ? null : String(body.subject);
  const imageAssetId =
    body.imageAssetId === undefined
      ? undefined
      : body.imageAssetId === null || body.imageAssetId === ""
        ? null
        : String(body.imageAssetId);
  const imageAlt =
    body.imageAlt === undefined ? undefined : body.imageAlt === null || body.imageAlt === "" ? null : String(body.imageAlt);

  if (type && !Object.values(TemplateType).includes(type as TemplateType)) {
    return badRequest("Invalid type");
  }

  try {
    const template = await updateTemplate(templateId, {
      type: type as TemplateType | undefined,
      name: body.name ? String(body.name) : undefined,
      subject,
      body: body.body !== undefined ? String(body.body) : undefined,
      imageAssetId,
      imageAlt
    });

    await writeAuditLog({
      organizationId: existing.organizationId,
      actorUserId: auth.user.id,
      action: "template.updated",
      entityType: "Template",
      entityId: template.id,
      metadata: {
        previousType: existing.type,
        nextType: template.type,
        previousName: existing.name,
        nextName: template.name
      }
    });

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("Template name must be unique within organization + type");
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const { templateId } = await params;
  const existing = await prisma.template.findUnique({
    where: { id: templateId }
  });

  if (!existing) {
    return notFound("Template not found");
  }

  if (!canAccessOrganization(auth.user, existing.organizationId)) {
    return forbidden();
  }

  await deleteTemplate(templateId);

  await writeAuditLog({
    organizationId: existing.organizationId,
    actorUserId: auth.user.id,
    action: "template.deleted",
    entityType: "Template",
    entityId: existing.id,
    metadata: { type: existing.type, name: existing.name }
  });

  return NextResponse.json({ ok: true });
}
