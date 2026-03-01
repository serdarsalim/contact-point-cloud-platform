"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordForm({ forceChange }: { forceChange: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to change password");
      setIsSaving(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <section className="change-password-shell">
      <form className="card change-password-card" onSubmit={handleSubmit}>
        <h2>{forceChange ? "Change Your Password to Continue" : "Change Password"}</h2>
        {forceChange ? (
          <p className="change-password-note">Your current password is temporary. Set your own password now.</p>
        ) : null}
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="change-password-error">{error}</p> : null}
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Update password"}
        </button>
      </form>
    </section>
  );
}
