import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { ChangePasswordForm } from "@/app/admin/_components/change-password-form";
import { isSuperadmin } from "@/lib/auth/rbac";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main className="admin-main">
      <AdminNavbar isSuperadmin={isSuperadmin(user)} userEmail={user.email} />
      <ChangePasswordForm forceChange={user.mustChangePassword} />
    </main>
  );
}
