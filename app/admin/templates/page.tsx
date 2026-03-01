import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { listTemplates } from "@/lib/services/template-service";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";
import { TemplatesManager } from "@/app/admin/_components/templates-manager";

export default async function TemplatesPage({
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
      <main className="admin-main templates-page-main">
        <AdminNavbar isSuperadmin={superadmin} userEmail={user.email} />
        <div className="card">
          <h1>No organization available</h1>
          <p>You do not have organization access for template management.</p>
        </div>
      </main>
    );
  }

  const initialTemplates = await listTemplates({ organizationId: selectedOrganization.id });

  return (
    <main className="admin-main templates-page-main">
      <AdminNavbar
        isSuperadmin={superadmin}
        organizationName={selectedOrganization.name}
        organizationId={selectedOrganization.id}
        organizations={
          superadmin
            ? undefined
            : user.memberships.map((membership) => ({
                id: membership.organizationId,
                name: membership.organization.name
              }))
        }
        currentOrganizationId={selectedOrganization.id}
        userEmail={user.email}
      />
      <TemplatesManager
        organizationId={selectedOrganization.id}
        initialTemplates={initialTemplates.map((template) => ({
          id: template.id,
          organizationId: template.organizationId,
          type: template.type,
          name: template.name,
          subject: template.subject,
          body: template.body
        }))}
      />
    </main>
  );
}
