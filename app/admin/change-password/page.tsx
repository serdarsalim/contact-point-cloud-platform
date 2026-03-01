import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { ChangePasswordForm } from "@/app/admin/_components/change-password-form";
import { LogoutButton } from "@/app/admin/_components/logout-button";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <main>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0 }}>
          Signed in as <strong>{user.username}</strong>
        </p>
        <LogoutButton />
      </div>
      <ChangePasswordForm forceChange={user.mustChangePassword} />
    </main>
  );
}
