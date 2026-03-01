import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { LogoutButton } from "@/app/admin/_components/logout-button";

export default async function AdminHomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main>
      <div className="card">
        <h1>Admin Dashboard</h1>
        <p>
          Signed in as <strong>{user.username}</strong> ({user.email})
        </p>
        <p>Role: {isSuperadmin(user) ? "SUPERADMIN" : "ADMIN"}</p>
        <div className="grid cols-3">
          <Link href="/admin/templates">Template Manager</Link>
          <Link href="/admin/api-keys">API Key Manager</Link>
          {isSuperadmin(user) ? <Link href="/admin/orgs">Organization Manager</Link> : null}
          {isSuperadmin(user) ? <Link href="/admin/users">User Manager</Link> : null}
        </div>
        <LogoutButton />
      </div>

      <div className="card">
        <h3>Organization Access</h3>
        {user.memberships.length === 0 ? <p>No organizations assigned.</p> : null}
        {user.memberships.map((membership) => (
          <p key={membership.id}>
            <strong>{membership.organization.name}</strong> - {membership.role}
          </p>
        ))}
      </div>
    </main>
  );
}
