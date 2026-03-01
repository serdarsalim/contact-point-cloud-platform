import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { listApiKeys } from "@/lib/services/api-key-service";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";
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
  const superadmin = isSuperadmin(user);

  const defaultOrgId = organizations[0]?.id || getDefaultOrganizationId(user);
  const selectedOrgId =
    requestedOrgId && canAccessOrganization(user, requestedOrgId) ? requestedOrgId : defaultOrgId;
  const selectedOrganization = organizations.find((org) => org.id === selectedOrgId) || organizations[0] || null;

  if (!selectedOrganization) {
    return (
      <main className="admin-main">
        <AdminNavbar isSuperadmin={superadmin} userEmail={user.email} />
        <div className="card">
          <h1>No organization available</h1>
          <p>You do not have organization access for API key management.</p>
        </div>
      </main>
    );
  }

  const initialApiKeys = await listApiKeys(selectedOrganization.id);

  return (
    <main className="admin-main">
      <AdminNavbar
        isSuperadmin={superadmin}
        organizationName={selectedOrganization.name}
        organizationId={selectedOrganization.id}
        userEmail={user.email}
      />
      <ApiKeysManager
        organizationId={selectedOrganization.id}
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
