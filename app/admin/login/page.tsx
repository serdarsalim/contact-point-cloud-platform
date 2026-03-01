import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { LoginForm } from "@/app/admin/_components/login-form";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect(user.mustChangePassword ? "/admin/change-password" : "/admin");
  }

  return (
    <main>
      <LoginForm />
    </main>
  );
}
