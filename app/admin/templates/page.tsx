import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { listTemplates } from "@/lib/services/template-service";
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

  const { orgId: requestedOrgId } = await searchParams;

  const organizations = isSuperadmin(user)
    ? await prisma.organization.findMany({ orderBy: { name: "asc" } })
    : user.memberships.map((membership) => membership.organization);

  const defaultOrgId = organizations[0]?.id || getDefaultOrganizationId(user);
  const selectedOrgId =
    requestedOrgId && canAccessOrganization(user, requestedOrgId) ? requestedOrgId : defaultOrgId;
  const initialTemplates = defaultOrgId
    ? await listTemplates({ organizationId: selectedOrgId! })
    : [];

  return (
    <main>
      <TemplatesManager
        organizations={organizations.map((org) => ({ id: org.id, name: org.name }))}
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
