"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ variant = "button" }: { variant?: "button" | "link" }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (variant === "link") {
    return (
      <button className="logout-link" type="button" onClick={handleLogout}>
        Sign out
      </button>
    );
  }

  return (
    <button className="secondary button-inline" type="button" onClick={handleLogout}>
      Sign out
    </button>
  );
}
