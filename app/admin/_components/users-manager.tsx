"use client";

import { FormEvent, useState } from "react";

type Organization = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "SUPERADMIN";
  organizations: string[];
};

export function UsersManager({
  organizations,
  initialUsers
}: {
  organizations: Organization[];
  initialUsers: UserRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || "");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);

  async function refreshUsers() {
    const response = await fetch("/api/admin/users");
    if (!response.ok) return;
    const data = (await response.json()) as {
      users: Array<{
        id: string;
        username: string;
        email: string;
        role: "ADMIN" | "SUPERADMIN";
        memberships: Array<{
          organization: {
            name: string;
          };
        }>;
      }>;
    };
    setUsers(
      data.users.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        organizations: row.memberships.map((membership) => membership.organization.name)
      }))
    );
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGeneratedPassword(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, email, organizationId })
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; generatedPassword?: string }
      | null;

    if (!response.ok) {
      setError(data?.error || "Failed to create user");
      return;
    }

    setUsername("");
    setEmail("");
    setGeneratedPassword(data?.generatedPassword || null);
    await refreshUsers();
  }

  async function promoteToSuperadmin(userId: string) {
    if (!confirm("Promote this user to SUPERADMIN? This will remove all org memberships.")) {
      return;
    }

    setError(null);
    setGeneratedPassword(null);
    setPromotingUserId(userId);

    const response = await fetch(`/api/admin/users/${userId}/promote`, {
      method: "POST"
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to promote user");
      setPromotingUserId(null);
      return;
    }

    setPromotingUserId(null);
    await refreshUsers();
  }

  return (
    <div className="grid cols-2">
      <form className="card" onSubmit={createUser}>
        <h3>Create org admin (superadmin only)</h3>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Organization
          <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <button type="submit">Create user</button>
        {generatedPassword ? (
          <p>
            One-time generated password: <code>{generatedPassword}</code>
          </p>
        ) : null}
      </form>

      <div className="card">
        <h3>Users</h3>
        {users.length === 0 ? <p>No users</p> : null}
        {users.map((user) => (
          <div key={user.id} style={{ marginBottom: "0.65rem" }}>
            <strong>{user.username}</strong>
            <p style={{ margin: "0.15rem 0" }}>{user.email}</p>
            <p style={{ margin: "0.15rem 0" }}>
              Role: <strong>{user.role}</strong>
            </p>
            {user.role === "ADMIN" ? (
              <p style={{ margin: "0.15rem 0" }}>Orgs: {user.organizations.join(", ") || "None"}</p>
            ) : null}
            {user.role === "ADMIN" ? (
              <button
                type="button"
                onClick={() => promoteToSuperadmin(user.id)}
                disabled={promotingUserId === user.id}
              >
                {promotingUserId === user.id ? "Promoting..." : "Promote to SUPERADMIN"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
