import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";
import { listUsersWithMemberships } from "@/lib/services/user-service";
import { UsersManager } from "@/app/admin/_components/users-manager";

export default async function UsersPage() {
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
        <AdminNavbar
          isSuperadmin={false}
          userEmail={user.email}
          organizations={user.memberships.map((membership) => ({
            id: membership.organizationId,
            name: membership.organization.name
          }))}
          currentOrganizationId={user.memberships[0]?.organizationId}
        />
        <div className="card">
          <h1>Forbidden</h1>
          <p>Only SUPERADMIN can manage users.</p>
        </div>
      </main>
    );
  }

  const organizations = await prisma.organization.findMany({ orderBy: { name: "asc" } });
  const users = await listUsersWithMemberships();

  return (
    <main className="admin-main">
      <AdminNavbar isSuperadmin={true} userEmail={user.email} />
      <UsersManager
        organizations={organizations.map((org) => ({ id: org.id, name: org.name }))}
        initialUsers={users.map((row) => ({
          id: row.id,
          username: row.username,
          email: row.email
        }))}
      />
    </main>
  );
}
