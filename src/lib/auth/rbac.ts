import { MembershipRole } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/admin-auth";

export function isSuperadmin(user: SessionUser): boolean {
  return user.memberships.some((membership) => membership.role === MembershipRole.SUPERADMIN);
}

export function canAccessOrganization(user: SessionUser, organizationId: string): boolean {
  if (isSuperadmin(user)) {
    return true;
  }

  return user.memberships.some((membership) => membership.organizationId === organizationId);
}

export function getDefaultOrganizationId(user: SessionUser): string | null {
  return user.memberships[0]?.organizationId ?? null;
}
