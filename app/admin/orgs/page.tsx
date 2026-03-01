import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";
import { listOrganizations } from "@/lib/services/org-service";
import { OrgsManager } from "@/app/admin/_components/orgs-manager";

export default async function OrganizationsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.mustChangePassword) {
    redirect("/admin/change-password");
  }

  if (!isSuperadmin(user)) {
    return (
      <main className="admin-main">
        <AdminNavbar isSuperadmin={false} userEmail={user.email} />
        <div className="card">
          <h1>Forbidden</h1>
          <p>Only SUPERADMIN can manage organizations.</p>
        </div>
      </main>
    );
  }

  const organizations = await listOrganizations();

  return (
    <main className="admin-main">
      <AdminNavbar isSuperadmin={true} userEmail={user.email} />
      <OrgsManager
        initialOrganizations={organizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          memberCount: org._count.members
        }))}
      />
    </main>
  );
}
