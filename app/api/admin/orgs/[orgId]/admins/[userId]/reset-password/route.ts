import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { resetOrganizationAdminPassword } from "@/lib/services/user-service";
import { writeAuditLog } from "@/lib/services/audit-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isSuperadmin(auth.user)) {
    return forbidden("Only SUPERADMIN can reset admin passwords");
  }

  const { orgId, userId } = await params;

  try {
    const reset = await resetOrganizationAdminPassword({
      organizationId: orgId,
      userId
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: auth.user.id,
      action: "org.admin.password_reset",
      entityType: "User",
      entityId: reset.user.id,
      metadata: {
        resetUserId: reset.user.id,
        resetUsername: reset.user.username
      }
    });

    return NextResponse.json({
      user: {
        id: reset.user.id,
        username: reset.user.username,
        email: reset.user.email
      },
      generatedPassword: reset.generatedPassword,
      passwordReveal: "one-time"
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBERSHIP_NOT_FOUND") {
      return notFound("Organization admin membership not found");
    }

    if (error instanceof Error && error.message === "TARGET_NOT_ADMIN") {
      return badRequest("Password reset is only supported for ADMIN users");
    }

    throw error;
  }
}
