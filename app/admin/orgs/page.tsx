import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { listOrganizations } from "@/lib/services/org-service";
import { OrgsManager } from "@/app/admin/_components/orgs-manager";

export default async function OrganizationsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (!isSuperadmin(user)) {
    return (
      <main>
        <div className="card">
          <h1>Forbidden</h1>
          <p>Only SUPERADMIN can manage organizations.</p>
        </div>
      </main>
    );
  }

  const organizations = await listOrganizations();

  return (
    <main>
      <OrgsManager
        initialOrganizations={organizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug
        }))}
      />
    </main>
  );
}
