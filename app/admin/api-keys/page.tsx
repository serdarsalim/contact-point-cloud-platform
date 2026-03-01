import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";

export default async function ApiKeysPage({
  searchParams
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.mustChangePassword) {
    redirect("/admin/change-password");
  }

  const { orgId: requestedOrgId } = await searchParams;

  if (requestedOrgId && canAccessOrganization(user, requestedOrgId)) {
    redirect(`/admin/orgs/${requestedOrgId}`);
  }

  if (isSuperadmin(user)) {
    redirect("/admin/orgs");
  }

  const fallbackOrgId = getDefaultOrganizationId(user) || user.memberships[0]?.organizationId;

  if (fallbackOrgId) {
    redirect(`/admin/orgs/${fallbackOrgId}`);
  }

  redirect("/admin");
}
