"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type OrgAdmin = {
  id: string;
  role: "ADMIN";
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    createdAt: string;
  };
};

export function OrgWorkspace({
  org,
  initialAdmins,
  canResetAdminPasswords
}: {
  org: { id: string; name: string; slug: string };
  initialAdmins: OrgAdmin[];
  canResetAdminPasswords: boolean;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resetPasswordReveal, setResetPasswordReveal] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshAdmins() {
    const response = await fetch(`/api/admin/orgs/${org.id}/admins`);
    if (!response.ok) return;

    const data = (await response.json()) as {
      admins: Array<{
        id: string;
        role: "ADMIN";
        createdAt: string;
        user: {
          id: string;
          username: string;
          email: string;
          createdAt: string;
        };
      }>;
    };

    setAdmins(
      data.admins.map((admin) => ({
        id: admin.id,
        role: admin.role,
        createdAt: admin.createdAt,
        user: admin.user
      }))
    );
  }

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGeneratedPassword(null);
    setResetPasswordReveal(null);

    const response = await fetch(`/api/admin/orgs/${org.id}/admins`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, email })
    });

    const data = (await response.json().catch(() => null)) as
      | { generatedPassword?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(data?.error || "Failed to create admin");
      return;
    }

    setUsername("");
    setEmail("");
    setGeneratedPassword(data?.generatedPassword || null);
    await refreshAdmins();
  }

  async function revokeAdmin(userId: string, username: string) {
    const confirmed = window.confirm(
      `Delete user ${username} from this organization? This removes their admin access.`
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setResetPasswordReveal(null);

    const response = await fetch(`/api/admin/orgs/${org.id}/admins`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to revoke admin");
      return;
    }

    await refreshAdmins();
  }

  async function resetAdminPassword(userId: string, username: string) {
    setError(null);

    const response = await fetch(`/api/admin/orgs/${org.id}/admins/${userId}/reset-password`, {
      method: "POST"
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; generatedPassword?: string }
      | null;

    if (!response.ok) {
      setError(data?.error || "Failed to reset password");
      return;
    }

    setResetPasswordReveal({
      username,
      password: data?.generatedPassword || ""
    });
  }

  return (
    <div className="grid">
      <div className="card">
        <h1 style={{ marginBottom: "0.25rem" }}>{org.name}</h1>
        <p style={{ margin: 0 }}>
          <code>{org.slug}</code>
        </p>
        <div className="grid cols-3" style={{ marginTop: "1rem" }}>
          <Link href="/admin/orgs">Back to org directory</Link>
          <Link href={`/admin/templates?orgId=${org.id}`}>Manage templates</Link>
          <Link href={`/admin/api-keys?orgId=${org.id}`}>Manage API keys</Link>
        </div>
      </div>

      <div className="grid cols-2">
        <form className="card" onSubmit={createAdmin}>
          <h3>Create org admin</h3>
          <p style={{ marginTop: 0 }}>Creates a new admin login credential for this organization.</p>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
          <button type="submit">Create admin</button>
          {generatedPassword ? (
            <p>
              One-time generated password: <code>{generatedPassword}</code>
            </p>
          ) : null}
          {resetPasswordReveal ? (
            <p>
              Reset password for <strong>{resetPasswordReveal.username}</strong>:{" "}
              <code>{resetPasswordReveal.password}</code>
            </p>
          ) : null}
        </form>

        <div className="card">
          <h3>Org admins ({admins.length})</h3>
          {admins.length === 0 ? <p>No admins assigned.</p> : null}
          {admins.map((admin) => (
            <div key={admin.id} style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "0.6rem", marginBottom: "0.6rem" }}>
              <p style={{ margin: "0.15rem 0" }}>
                <strong>{admin.user.username}</strong> ({admin.user.email})
              </p>
              <div className="org-admin-actions">
                {canResetAdminPasswords ? (
                  <button
                    className="secondary button-inline"
                    type="button"
                    onClick={() => resetAdminPassword(admin.user.id, admin.user.username)}
                  >
                    Reset password
                  </button>
                ) : null}
                <button
                  className="danger button-inline"
                  type="button"
                  onClick={() => revokeAdmin(admin.user.id, admin.user.username)}
                >
                  Delete user
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
