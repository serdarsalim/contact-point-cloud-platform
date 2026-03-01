import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, isSuperadmin } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";
import { listOrganizationAdmins } from "@/lib/services/user-service";
import { OrgWorkspace } from "@/app/admin/_components/org-workspace";
import { listApiKeys } from "@/lib/services/api-key-service";

export default async function OrganizationWorkspacePage({
  params
}: {
  params: Promise<{ orgId: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.mustChangePassword) {
    redirect("/admin/change-password");
  }

  const { orgId } = await params;

  if (!canAccessOrganization(user, orgId)) {
    return (
      <main className="admin-main">
        <AdminNavbar
          isSuperadmin={isSuperadmin(user)}
          userEmail={user.email}
          organizations={user.memberships.map((membership) => ({
            id: membership.organizationId,
            name: membership.organization.name
          }))}
          currentOrganizationId={orgId}
        />
        <div className="card">
          <h1>Forbidden</h1>
          <p>You do not have access to this organization workspace.</p>
        </div>
      </main>
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: {
          templates: true,
          apiKeys: true
        }
      }
    }
  });

  if (!organization) {
    notFound();
  }

  const admins = await listOrganizationAdmins(orgId);
  const apiKeys = await listApiKeys(orgId);
  const superadmin = isSuperadmin(user);

  return (
    <main className="admin-main">
      <AdminNavbar
        isSuperadmin={superadmin}
        organizationName={organization.name}
        organizationId={organization.id}
        organizations={
          superadmin
            ? undefined
            : user.memberships.map((membership) => ({
                id: membership.organizationId,
                name: membership.organization.name
              }))
        }
        currentOrganizationId={organization.id}
        userEmail={user.email}
      />
      <OrgWorkspace
        org={{
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          templateCount: organization._count.templates,
          apiKeyCount: organization._count.apiKeys
        }}
        canResetAdminPasswords={superadmin}
        initialAdmins={admins.map((admin) => ({
          id: admin.id,
          role: "ADMIN",
          createdAt: admin.createdAt.toISOString(),
          user: {
            id: admin.user.id,
            username: admin.user.username,
            email: admin.user.email,
            createdAt: admin.user.createdAt.toISOString()
          }
        }))}
        initialApiTokens={apiKeys.map((apiKey) => ({
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
