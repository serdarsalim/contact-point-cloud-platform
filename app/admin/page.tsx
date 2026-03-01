import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { LogoutButton } from "@/app/admin/_components/logout-button";
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
    <main>
      <div className="card">
        <div className="admin-card-header">
          <h1>Admin Dashboard</h1>
          <LogoutButton />
        </div>
        <p>
          Signed in as <strong>{user.username}</strong> ({user.email}) - {superadmin ? "Superadmin" : "Admin"}
        </p>
        {!superadmin ? (
          <div className="grid cols-3">
            <Link href="/admin/templates">Template Manager</Link>
            <Link href="/admin/api-keys">API Key Manager</Link>
          </div>
        ) : null}
      </div>

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
