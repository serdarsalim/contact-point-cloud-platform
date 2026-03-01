import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { readBody } from "@/lib/request";
import { deleteOrganization, updateOrganization } from "@/lib/services/org-service";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isSuperadmin(auth.user)) {
    return forbidden();
  }

  const { orgId } = await params;
  const body = await readBody(request);
  const name = body.name ? String(body.name) : undefined;
  const slug = body.slug ? String(body.slug) : undefined;

  if (!name && !slug) {
    return badRequest("Provide at least one field to update");
  }

  try {
    const organization = await updateOrganization(orgId, { name, slug });

    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: auth.user.id,
      action: "org.updated",
      entityType: "Organization",
      entityId: organization.id,
      metadata: { name: organization.name, slug: organization.slug }
    });

    return NextResponse.json({ organization });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Organization not found");
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("Organization name or slug must be unique");
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isSuperadmin(auth.user)) {
    return forbidden();
  }

  const { orgId } = await params;

  try {
    const existing = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    await deleteOrganization(orgId);

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: auth.user.id,
      action: "org.deleted",
      entityType: "Organization",
      entityId: orgId,
      metadata: { name: existing?.name || null, slug: existing?.slug || null }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Organization not found");
    }

    throw error;
  }
}
