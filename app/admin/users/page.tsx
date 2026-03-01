import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
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
      <main>
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
    <main>
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
