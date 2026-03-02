import { MembershipRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization } from "@/lib/auth/rbac";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { readBody } from "@/lib/request";
import { assignOrganizationAdmin, revokeOrganizationAdmin } from "@/lib/services/org-service";
import {
  createOrganizationAdminWithGeneratedPassword,
  listOrganizationAdmins
} from "@/lib/services/user-service";
import { writeAuditLog } from "@/lib/services/audit-service";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const { orgId } = await params;

  if (!canAccessOrganization(auth.user, orgId)) {
    return forbidden();
  }

  const admins = await listOrganizationAdmins(orgId);
  return NextResponse.json({ admins });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const { orgId } = await params;

  if (!canAccessOrganization(auth.user, orgId)) {
    return forbidden();
  }

  const body = await readBody(request);
  const userId = body.userId ? String(body.userId).trim() : "";
  const username = body.username ? String(body.username).trim() : "";
  const email = body.email ? String(body.email).trim().toLowerCase() : "";

  if (username || email) {
    if (!username || !email) {
      return badRequest("username and email are required");
    }

    const byUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true }
    });
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true }
    });

    if (byUsername && byEmail && byUsername.id !== byEmail.id) {
      return badRequest("Username and email belong to different users");
    }

    if (byUsername && !byEmail && byUsername.email.toLowerCase() !== email) {
      return badRequest("Username already exists with a different email");
    }

    if (byEmail && !byUsername && byEmail.username !== username) {
      return badRequest("Email already exists with a different username");
    }

    const matchedUser = byUsername || byEmail;

    if (matchedUser) {
      try {
        const membership = await assignOrganizationAdmin({
          organizationId: orgId,
          userId: matchedUser.id,
          role: MembershipRole.ADMIN
        });

        await writeAuditLog({
          organizationId: orgId,
          actorUserId: auth.user.id,
          action: "org.admin.assigned",
          entityType: "OrganizationMember",
          entityId: membership.id,
          metadata: { assignedUserId: matchedUser.id, role: MembershipRole.ADMIN }
        });

        return NextResponse.json({
          admin: matchedUser,
          membership,
          generatedPassword: null,
          passwordReveal: null
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          return notFound("Organization or user not found");
        }

        throw error;
      }
    }

    try {
      const created = await createOrganizationAdminWithGeneratedPassword({
        organizationId: orgId,
        username,
        email
      });

      await writeAuditLog({
        organizationId: orgId,
        actorUserId: auth.user.id,
        action: "org.admin.created",
        entityType: "User",
        entityId: created.user.id,
        metadata: { username: created.user.username, email: created.user.email }
      });

      return NextResponse.json(
        {
          admin: created.user,
          membership: created.membership,
          generatedPassword: created.generatedPassword,
          passwordReveal: "one-time"
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return badRequest("Username or email already exists");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        return notFound("Organization not found");
      }

      throw error;
    }
  }

  if (!userId) {
    return badRequest("Provide userId to assign existing user, or username+email to create new admin");
  }

  try {
    const membership = await assignOrganizationAdmin({
      organizationId: orgId,
      userId,
      role: MembershipRole.ADMIN
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: auth.user.id,
      action: "org.admin.assigned",
      entityType: "OrganizationMember",
      entityId: membership.id,
      metadata: { assignedUserId: userId, role: MembershipRole.ADMIN }
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

  const { orgId } = await params;

  if (!canAccessOrganization(auth.user, orgId)) {
    return forbidden();
  }

  const body = await readBody(request);
  const userId = String(body.userId || "").trim();

  if (!userId) {
    return badRequest("userId is required");
  }

  try {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId
        }
      }
    });

    if (!membership) {
      return notFound("Membership not found");
    }

    if (membership.role !== MembershipRole.ADMIN) {
      return badRequest("Only ADMIN memberships can be revoked through this endpoint");
    }

    const adminCount = await prisma.organizationMember.count({
      where: {
        organizationId: orgId,
        role: MembershipRole.ADMIN
      }
    });

    if (adminCount <= 1) {
      return badRequest("Cannot remove the last ADMIN from an organization");
    }

    await revokeOrganizationAdmin({ organizationId: orgId, userId });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: auth.user.id,
      action: "org.admin.revoked",
      entityType: "OrganizationMember",
      entityId: membership.id,
      metadata: { revokedUserId: userId, role: membership.role }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("Membership not found");
    }

    throw error;
  }
}
