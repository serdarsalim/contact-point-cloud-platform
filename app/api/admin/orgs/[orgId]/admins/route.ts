import { MembershipRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { readBody } from "@/lib/request";
import { assignOrganizationAdmin, revokeOrganizationAdmin } from "@/lib/services/org-service";

export async function POST(
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
  const userId = String(body.userId || "").trim();
  const role = String(body.role || MembershipRole.ADMIN).toUpperCase() as MembershipRole;

  if (!userId) {
    return badRequest("userId is required");
  }

  if (![MembershipRole.ADMIN, MembershipRole.SUPERADMIN].includes(role)) {
    return badRequest("role must be ADMIN or SUPERADMIN");
  }

  try {
    const membership = await assignOrganizationAdmin({
      organizationId: orgId,
      userId,
      role
    });

    return NextResponse.json({ membership });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return notFound("Organization or user not found");
    }

    throw error;
  }
}

export async function DELETE(
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
  const userId = String(body.userId || "").trim();

  if (!userId) {
    return badRequest("userId is required");
  }

  try {
    await revokeOrganizationAdmin({ organizationId: orgId, userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Membership not found");
    }

    throw error;
  }
}
