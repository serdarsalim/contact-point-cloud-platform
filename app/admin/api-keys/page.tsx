import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { listApiKeys } from "@/lib/services/api-key-service";
import { ApiKeysManager } from "@/app/admin/_components/api-keys-manager";

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

  const organizations = isSuperadmin(user)
    ? await prisma.organization.findMany({ orderBy: { name: "asc" } })
    : user.memberships.map((membership) => membership.organization);

  const defaultOrgId = organizations[0]?.id || getDefaultOrganizationId(user);
  const selectedOrgId =
    requestedOrgId && canAccessOrganization(user, requestedOrgId) ? requestedOrgId : defaultOrgId;
  const initialApiKeys = selectedOrgId ? await listApiKeys(selectedOrgId) : [];

  return (
    <main>
      <ApiKeysManager
        organizations={organizations.map((org) => ({ id: org.id, name: org.name }))}
        initialApiKeys={initialApiKeys.map((apiKey) => ({
          id: apiKey.id,
          organizationId: apiKey.organizationId,
          label: apiKey.label,
          prefix: apiKey.prefix,
          scopes: apiKey.scopes,
          revokedAt: apiKey.revokedAt ? apiKey.revokedAt.toISOString() : null,
          lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null
        }))}
      />
    </main>
  );
}
