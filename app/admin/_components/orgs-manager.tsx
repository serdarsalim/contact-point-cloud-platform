"use client";

import { FormEvent, useState } from "react";

type Org = {
  id: string;
  name: string;
  slug: string;
};

export function OrgsManager({ initialOrganizations }: { initialOrganizations: Org[] }) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminOrgId, setAdminOrgId] = useState(initialOrganizations[0]?.id || "");
  const [adminUserId, setAdminUserId] = useState("");
  const [adminRole, setAdminRole] = useState<"ADMIN" | "SUPERADMIN">("ADMIN");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/orgs");
    if (!response.ok) return;
    const data = (await response.json()) as { organizations: Org[] };
    setOrganizations(data.organizations);
  }

  async function createOrg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/orgs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to create organization");
      return;
    }

    setName("");
    setSlug("");
    await refresh();
  }

  async function deleteOrg(orgId: string) {
    const response = await fetch(`/api/admin/orgs/${orgId}`, { method: "DELETE" });
    if (!response.ok) return;
    await refresh();
  }

  async function assignAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/admin/orgs/${adminOrgId}/admins`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: adminUserId, role: adminRole })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to assign admin");
      return;
    }

    setAdminUserId("");
  }

  async function revokeAdmin() {
    setError(null);

    const response = await fetch(`/api/admin/orgs/${adminOrgId}/admins`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: adminUserId })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to revoke admin");
      return;
    }

    setAdminUserId("");
  }

  return (
    <div className="grid">
      <form className="card" onSubmit={createOrg}>
        <h3>Create organization</h3>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Slug (optional)
          <input value={slug} onChange={(event) => setSlug(event.target.value)} />
        </label>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <button type="submit">Create</button>
      </form>

      <div className="card">
        <h3>Organizations</h3>
        {organizations.length === 0 ? <p>No organizations</p> : null}
        {organizations.map((org) => (
          <div key={org.id} style={{ marginBottom: "0.75rem" }}>
            <strong>{org.name}</strong> <code>{org.slug}</code>
            <button className="danger" type="button" onClick={() => deleteOrg(org.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      <form className="card" onSubmit={assignAdmin}>
        <h3>Assign/Revoke admin</h3>
        <label>
          Organization
          <select value={adminOrgId} onChange={(event) => setAdminOrgId(event.target.value)} required>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          User ID
          <input value={adminUserId} onChange={(event) => setAdminUserId(event.target.value)} required />
        </label>
        <label>
          Role
          <select value={adminRole} onChange={(event) => setAdminRole(event.target.value as "ADMIN" | "SUPERADMIN")}>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPERADMIN">SUPERADMIN</option>
          </select>
        </label>
        <button type="submit">Assign admin</button>
        <button className="danger" type="button" onClick={() => void revokeAdmin()}>
          Revoke admin
        </button>
      </form>
    </div>
  );
}
