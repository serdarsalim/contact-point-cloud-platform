import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { readBody } from "@/lib/request";
import { deleteOrganization, updateOrganization } from "@/lib/services/org-service";

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
    await deleteOrganization(orgId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Organization not found");
    }

    throw error;
  }
}
