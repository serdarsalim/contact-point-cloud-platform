import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";
import { listOrganizations } from "@/lib/services/org-service";
import { OrgsManager } from "@/app/admin/_components/orgs-manager";

export default async function AdminHomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.mustChangePassword) {
    redirect("/admin/change-password");
  }

  const superadmin = isSuperadmin(user);
  const organizations = superadmin ? await listOrganizations() : [];

  return (
    <main className="admin-main">
      <AdminNavbar isSuperadmin={superadmin} userEmail={user.email} />

      {superadmin ? (
        <OrgsManager
          initialOrganizations={organizations.map((org) => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            memberCount: org._count.members
          }))}
        />
      ) : (
        <div className="card">
          <h3>Organization Access</h3>
          {user.memberships.length === 0 ? <p>No organizations assigned.</p> : null}
          {user.memberships.map((membership) => (
            <p key={membership.id}>
              <Link href={`/admin/orgs/${membership.organizationId}`}>
                <strong>{membership.organization.name}</strong> - {membership.role}
              </Link>
            </p>
          ))}
        </div>
      )}
    </main>
  );
}
