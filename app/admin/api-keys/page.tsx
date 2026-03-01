import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { listApiKeys } from "@/lib/services/api-key-service";
import { ApiKeysManager } from "@/app/admin/_components/api-keys-manager";

export default async function ApiKeysPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  const organizations = isSuperadmin(user)
    ? await prisma.organization.findMany({ orderBy: { name: "asc" } })
    : user.memberships.map((membership) => membership.organization);

  const defaultOrgId = organizations[0]?.id || getDefaultOrganizationId(user);
  const initialApiKeys = defaultOrgId ? await listApiKeys(defaultOrgId) : [];

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
