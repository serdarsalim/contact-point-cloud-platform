"use client";

import { FormEvent, useState } from "react";
import { ApiKeysManager } from "@/app/admin/_components/api-keys-manager";

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

type OrgApiToken = {
  id: string;
  organizationId: string;
  label: string;
  prefix: string;
  scopes: string[];
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export function OrgWorkspace({
  org,
  initialAdmins,
  initialApiTokens,
  canResetAdminPasswords
}: {
  org: { id: string; name: string; slug: string; templateCount: number; apiKeyCount: number };
  initialAdmins: OrgAdmin[];
  initialApiTokens: OrgApiToken[];
  canResetAdminPasswords: boolean;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [apiTokenCount, setApiTokenCount] = useState(org.apiKeyCount);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
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
    setShowCreateAdminModal(false);
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

  function closeCreateAdminModal() {
    setShowCreateAdminModal(false);
    setUsername("");
    setEmail("");
  }

  return (
    <section className="org-workspace-shell">
      <div className="card org-workspace-stats-card">
        <div className="org-stats-grid">
          <div className="org-stats-label">Stats</div>
          <div className="org-stat-tile">
            <span className="org-stat-label">Templates</span>
            <strong className="org-stat-value">{org.templateCount}</strong>
          </div>
          <div className="org-stat-tile">
            <span className="org-stat-label">API tokens</span>
            <strong className="org-stat-value">{apiTokenCount}</strong>
          </div>
          <div className="org-stat-tile">
            <span className="org-stat-label">Admins</span>
            <strong className="org-stat-value">{admins.length}</strong>
          </div>
        </div>
      </div>

      <div className="org-workspace-columns">
        <div className="card">
          <div className="org-admins-header">
            <h3>Admins ({admins.length})</h3>
            <button className="button-inline" type="button" onClick={() => setShowCreateAdminModal(true)}>
              + New Admin
            </button>
          </div>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
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
          {admins.length === 0 ? <p>No admins assigned.</p> : null}
          {admins.map((admin) => (
            <div
              key={admin.id}
              style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "0.6rem", marginBottom: "0.6rem" }}
            >
              <div className="org-admin-row">
                <p className="org-admin-identity">
                  <strong>{admin.user.username}</strong> ({admin.user.email})
                </p>
                <div className="org-admin-actions">
                  {canResetAdminPasswords ? (
                    <button
                      className="org-admin-link-button"
                      type="button"
                      onClick={() => resetAdminPassword(admin.user.id, admin.user.username)}
                    >
                      reset
                    </button>
                  ) : null}
                  <button
                    className="org-admin-delete-x"
                    type="button"
                    onClick={() => revokeAdmin(admin.user.id, admin.user.username)}
                    aria-label={`Delete user ${admin.user.username}`}
                    title={`Delete user ${admin.user.username}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <ApiKeysManager
          organizationId={org.id}
          initialApiKeys={initialApiTokens}
          onCountChange={setApiTokenCount}
        />
      </div>

      {showCreateAdminModal ? (
        <div className="admin-modal-backdrop" onClick={closeCreateAdminModal}>
          <div className="admin-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Create org admin</h3>
              <button className="secondary button-inline" type="button" onClick={closeCreateAdminModal}>
                Close
              </button>
            </div>
            <form onSubmit={createAdmin}>
              <label>
                Username
                <input value={username} onChange={(event) => setUsername(event.target.value)} required />
              </label>
              <label>
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
              <button className="button-inline" type="submit">
                Create admin
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
