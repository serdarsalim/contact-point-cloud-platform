"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Org = {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
};

export function OrgsManager({ initialOrganizations }: { initialOrganizations: Org[] }) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredOrgs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return organizations;
    }

    return organizations.filter(
      (org) => org.name.toLowerCase().includes(query) || org.slug.toLowerCase().includes(query)
    );
  }, [organizations, search]);

  async function refresh() {
    const response = await fetch("/api/admin/orgs");
    if (!response.ok) return;
    const data = (await response.json()) as {
      organizations: Array<{
        id: string;
        name: string;
        slug: string;
        _count: { templates: number; members: number };
      }>;
    };

    setOrganizations(
      data.organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        memberCount: org._count.members
      }))
    );
  }

  async function createOrg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGeneratedPassword(null);

    const response = await fetch("/api/admin/orgs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        adminUsername: adminUsername || undefined,
        adminEmail: adminEmail || undefined
      })
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; generatedPassword?: string }
      | null;

    if (!response.ok) {
      setError(data?.error || "Failed to create organization");
      return;
    }

    setName("");
    setAdminUsername("");
    setAdminEmail("");
    setGeneratedPassword(data?.generatedPassword || null);
    await refresh();
  }

  async function deleteOrg(orgId: string) {
    const response = await fetch(`/api/admin/orgs/${orgId}`, { method: "DELETE" });
    if (!response.ok) return;
    await refresh();
  }

  return (
    <div className="grid cols-2">
      <form className="card" onSubmit={createOrg}>
        <h3>Create organization</h3>
        <p style={{ marginTop: 0 }}>Creating an organization requires initial admin credentials.</p>
        <label>
          Organization name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Initial admin username
          <input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} required />
        </label>
        <label>
          Initial admin email
          <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required />
        </label>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <button type="submit">Create organization</button>
        {generatedPassword ? (
          <p>
            Initial admin one-time password: <code>{generatedPassword}</code>
          </p>
        ) : null}
      </form>

      <div className="card">
        <h3>Organizations</h3>
        <label>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or slug"
          />
        </label>
        {filteredOrgs.length === 0 ? <p>No organizations found.</p> : null}
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.75rem", marginBottom: "0.75rem" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
              <div>
                <strong>{org.name}</strong>
                <div>
                  <code>{org.slug}</code>
                </div>
                <p style={{ margin: "0.25rem 0 0" }}>
                  {org.memberCount} members
                </p>
              </div>
              <div style={{ display: "grid", gap: "0.35rem", minWidth: 180 }}>
                <Link href={`/admin/orgs/${org.id}`}>Open workspace</Link>
                <Link href={`/admin/templates?orgId=${org.id}`}>Open templates</Link>
                <Link href={`/admin/api-keys?orgId=${org.id}`}>Open API keys</Link>
                <button className="danger" type="button" onClick={() => deleteOrg(org.id)}>
                  Delete org
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
