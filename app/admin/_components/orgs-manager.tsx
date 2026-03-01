"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Org = {
  id: string;
  name: string;
  templateCount: number;
  apiTokenCount: number;
};

type OrgAdmin = {
  id: string;
  role: "ADMIN";
  user: {
    id: string;
    username: string;
    email: string;
  };
};

export function OrgsManager({ initialOrganizations }: { initialOrganizations: Org[] }) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [selectedOrgId, setSelectedOrgId] = useState(initialOrganizations[0]?.id || "");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [admins, setAdmins] = useState<OrgAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminsError, setAdminsError] = useState<string | null>(null);

  const filteredOrgs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return organizations;
    }

    return organizations.filter((org) => org.name.toLowerCase().includes(query));
  }, [organizations, search]);

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) || null;

  useEffect(() => {
    if (!selectedOrgId) {
      setAdmins([]);
      setAdminsError(null);
      return;
    }

    let cancelled = false;

    async function loadAdmins() {
      setAdminsLoading(true);
      setAdminsError(null);

      const response = await fetch(`/api/admin/orgs/${selectedOrgId}/admins`);
      const data = (await response.json().catch(() => null)) as
        | { error?: string; admins?: OrgAdmin[] }
        | null;

      if (cancelled) return;

      if (!response.ok) {
        setAdmins([]);
        setAdminsError(data?.error || "Failed to load admins");
        setAdminsLoading(false);
        return;
      }

      setAdmins(data?.admins || []);
      setAdminsLoading(false);
    }

    void loadAdmins();

    return () => {
      cancelled = true;
    };
  }, [selectedOrgId]);

  async function refresh() {
    const response = await fetch("/api/admin/orgs");
    if (!response.ok) return null;
    const data = (await response.json()) as {
      organizations: Array<{
        id: string;
        name: string;
        _count: { templates: number; members: number; apiKeys: number };
      }>;
    };

    const mapped = data.organizations.map((org) => ({
      id: org.id,
      name: org.name,
      templateCount: org._count.templates,
      apiTokenCount: org._count.apiKeys
    }));

    setOrganizations(mapped);

    return mapped;
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
      | { error?: string; generatedPassword?: string; organization?: { id: string } }
      | null;

    if (!response.ok) {
      setError(data?.error || "Failed to create organization");
      return;
    }

    setName("");
    setAdminUsername("");
    setAdminEmail("");
    setGeneratedPassword(data?.generatedPassword || null);
    const refreshed = await refresh();
    const nextSelectedOrgId = data?.organization?.id || refreshed?.[0]?.id || "";
    setSelectedOrgId(nextSelectedOrgId);
    setShowCreateForm(false);
  }

  async function deleteOrg(orgId: string, orgName: string) {
    const confirmed = window.confirm(`Delete organization ${orgName}? This cannot be undone.`);
    if (!confirmed) return;

    setError(null);

    const response = await fetch(`/api/admin/orgs/${orgId}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to delete organization");
      return;
    }

    const refreshed = await refresh();

    if (!refreshed || refreshed.length === 0) {
      setSelectedOrgId("");
      return;
    }

    if (orgId === selectedOrgId) {
      setSelectedOrgId(refreshed[0].id);
    }
  }

  return (
    <section className="orgs-layout">
      <aside className="card orgs-sidebar">
        <div className="orgs-sidebar-header">
          <button
            className="button-inline orgs-create-toggle"
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? "Close" : "+ Add"}
          </button>
        </div>

        {showCreateForm ? (
          <form className="org-create-form" onSubmit={createOrg}>
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
            <button type="submit">Create organization</button>
          </form>
        ) : null}

        {generatedPassword ? (
          <p className="orgs-password-reveal">
            Initial admin one-time password: <code>{generatedPassword}</code>
          </p>
        ) : null}

        {error ? <p className="orgs-error">{error}</p> : null}

        <label>
          Search organizations
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
          />
        </label>
        <div className="orgs-list">
          {filteredOrgs.length === 0 ? <p className="orgs-empty">No organizations found.</p> : null}
          {filteredOrgs.map((org) => (
            <button
              key={org.id}
              type="button"
              className={`orgs-list-item ${org.id === selectedOrgId ? "active" : ""}`}
              onClick={() => setSelectedOrgId(org.id)}
            >
              <span className="orgs-list-item-name">{org.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="card orgs-workspace">
        <div className="orgs-workspace-header">
          <h3>{selectedOrg ? selectedOrg.name : "Organization workspace"}</h3>
          {selectedOrg ? (
            <button
              className="danger button-inline"
              type="button"
              onClick={() => deleteOrg(selectedOrg.id, selectedOrg.name)}
            >
              Delete org
            </button>
          ) : null}
        </div>

        {selectedOrg ? (
          <div className="orgs-workspace-content">
            <div className="orgs-workspace-stats">
              <div className="orgs-workspace-stat">
                <span>Templates</span>
                <strong>{selectedOrg.templateCount}</strong>
              </div>
              <div className="orgs-workspace-stat">
                <span>Admins</span>
                <strong>{admins.length}</strong>
              </div>
              <div className="orgs-workspace-stat">
                <span>API tokens</span>
                <strong>{selectedOrg.apiTokenCount}</strong>
              </div>
            </div>

            <div className="orgs-workspace-links">
              <Link href={`/admin/orgs/${selectedOrg.id}`}>Open workspace</Link>
              <Link href={`/admin/templates?orgId=${selectedOrg.id}`}>Open templates</Link>
            </div>

            <div className="orgs-admins-section">
              <h4>Admins</h4>
              {adminsLoading ? <p>Loading admins...</p> : null}
              {adminsError ? <p className="orgs-error">{adminsError}</p> : null}
              {!adminsLoading && !adminsError && admins.length === 0 ? <p>No admins found.</p> : null}
              {!adminsLoading && !adminsError
                ? admins.map((admin) => (
                    <p key={admin.id} className="orgs-admin-row">
                      <strong>{admin.user.username}</strong> ({admin.user.email})
                    </p>
                  ))
                : null}
            </div>
          </div>
        ) : (
          <p>Select an organization from the left sidebar.</p>
        )}
      </section>
    </section>
  );
}
