import { redirect } from "next/navigation";
import { MembershipRole } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, isSuperadmin } from "@/lib/auth/rbac";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listOrganizationAdmins } from "@/lib/services/user-service";
import { OrgWorkspace } from "@/app/admin/_components/org-workspace";

export default async function OrganizationWorkspacePage({
  params
}: {
  params: Promise<{ orgId: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { orgId } = await params;

  if (!canAccessOrganization(user, orgId)) {
    return (
      <main>
        <div className="card">
          <h1>Forbidden</h1>
          <p>You do not have access to this organization workspace.</p>
        </div>
      </main>
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  if (!organization) {
    notFound();
  }

  const admins = await listOrganizationAdmins(orgId);
  const superadmin = isSuperadmin(user);

  return (
    <main>
      <OrgWorkspace
        org={{ id: organization.id, name: organization.name, slug: organization.slug }}
        canResetAdminPasswords={superadmin}
        initialAdmins={admins.map((admin) => ({
          id: admin.id,
          role: admin.role as MembershipRole,
          createdAt: admin.createdAt.toISOString(),
          user: {
            id: admin.user.id,
            username: admin.user.username,
            email: admin.user.email,
            createdAt: admin.user.createdAt.toISOString()
          }
        }))}
      />
    </main>
  );
}
