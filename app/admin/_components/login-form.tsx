"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured yet.",
  google_invalid_state: "Google sign-in could not be verified. Try again.",
  google_unverified_email: "Your Google account email is not verified.",
  google_no_access: "That Google account does not have admin access here.",
  google_sign_in_failed: "Google sign-in failed. Try again."
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const oauthError = searchParams.get("error");
  const displayError = error || (oauthError ? errorMessages[oauthError] || "Login failed" : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Login failed");
      setIsLoading(false);
      return;
    }

    const data = (await response.json()) as { user?: { mustChangePassword?: boolean } };
    router.push(data.user?.mustChangePassword ? "/admin/change-password" : "/admin");
    router.refresh();
  }

  return (
    <form className="card login-card" onSubmit={handleSubmit}>
      <h2>Log in</h2>
      <label>
        Username
        <input value={username} onChange={(event) => setUsername(event.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {displayError ? <p className="login-error">{displayError}</p> : null}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Log in"}
      </button>
      <a href="/api/auth/google/start" className="login-google-button">
        Continue with Google
      </a>
    </form>
  );
}
