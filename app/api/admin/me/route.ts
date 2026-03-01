import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";

export async function GET() {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  return NextResponse.json({
    user: {
      id: auth.user.id,
      username: auth.user.username,
      email: auth.user.email,
      isSuperadmin: isSuperadmin(auth.user),
      memberships: auth.user.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name
      }))
    }
  });
}
