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

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "SUPERADMIN";
};

export function OrgsManager({ initialOrganizations }: { initialOrganizations: Org[] }) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [selectedOrgId, setSelectedOrgId] = useState(initialOrganizations[0]?.id || "");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [adminMode, setAdminMode] = useState<"existing" | "new">("existing");
  const [existingAdminUserId, setExistingAdminUserId] = useState("");
  const [existingAdminSearch, setExistingAdminSearch] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [availableAdmins, setAvailableAdmins] = useState<AdminUser[]>([]);
  const [loadingAdminsList, setLoadingAdminsList] = useState(false);
  const [admins, setAdmins] = useState<OrgAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const filteredOrgs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return organizations;
    }

    return organizations.filter((org) => org.name.toLowerCase().includes(query));
  }, [organizations, search]);

  const filteredAvailableAdmins = useMemo(() => {
    const onlyAdmins = availableAdmins.filter((user) => user.role === "ADMIN");
    const query = existingAdminSearch.trim().toLowerCase();

    if (!query) {
      return onlyAdmins;
    }

    return onlyAdmins.filter(
      (user) => user.username.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }, [availableAdmins, existingAdminSearch]);

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

  useEffect(() => {
    if (!showCreateModal) {
      return;
    }

    let cancelled = false;

    async function loadAdminUsers() {
      setLoadingAdminsList(true);
      const response = await fetch("/api/admin/users");
      const data = (await response.json().catch(() => null)) as
        | { error?: string; users?: Array<{ id: string; username: string; email: string; role: "ADMIN" | "SUPERADMIN" }> }
        | null;

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setLoadingAdminsList(false);
        setError(data?.error || "Failed to load existing admins");
        return;
      }

      setAvailableAdmins(data?.users || []);
      setLoadingAdminsList(false);
    }

    void loadAdminUsers();

    return () => {
      cancelled = true;
    };
  }, [showCreateModal]);

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
        adminUserId: adminMode === "existing" ? existingAdminUserId || undefined : undefined,
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
    setAdminMode("existing");
    setExistingAdminUserId("");
    setExistingAdminSearch("");
    setAdminUsername("");
    setAdminEmail("");
    setGeneratedPassword(data?.generatedPassword || null);
    const refreshed = await refresh();
    const nextSelectedOrgId = data?.organization?.id || refreshed?.[0]?.id || "";
    setSelectedOrgId(nextSelectedOrgId);
    setShowCreateModal(false);
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

  async function renameOrg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedOrg) {
      return;
    }

    const nextName = renameValue.trim();
    if (!nextName) {
      setError("Organization name is required");
      return;
    }

    if (nextName === selectedOrg.name) {
      setShowRenameModal(false);
      return;
    }

    setRenaming(true);
    setError(null);

    const response = await fetch(`/api/admin/orgs/${selectedOrg.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: nextName })
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; organization?: { id: string; name: string } }
      | null;

    if (!response.ok) {
      setError(data?.error || "Failed to rename organization");
      setRenaming(false);
      return;
    }

    await refresh();
    setSelectedOrgId(data?.organization?.id || selectedOrg.id);
    setShowRenameModal(false);
    setRenaming(false);
  }

  return (
    <section className="orgs-layout">
      <aside className="card orgs-sidebar">
        <div className="orgs-sidebar-header">
          <button
            className="button-inline orgs-create-toggle"
            type="button"
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
          >
            + Add
          </button>
        </div>

        {generatedPassword ? (
          <p className="orgs-password-reveal">
            Initial admin one-time password: <code>{generatedPassword}</code>
          </p>
        ) : null}

        {error ? <p className="orgs-error">{error}</p> : null}

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name"
          aria-label="Search organizations"
        />
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
              <Link
                href={`/admin/orgs/${org.id}`}
                className="orgs-list-item-open"
                aria-label={`Open ${org.name} workspace`}
                title={`Open ${org.name} workspace`}
                onClick={(event) => event.stopPropagation()}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    d="M12.5 3.75h3.75V7.5m0-3.75-6.25 6.25m4.375-4.375V13.75a2.5 2.5 0 0 1-2.5 2.5H6.25a2.5 2.5 0 0 1-2.5-2.5V8.125a2.5 2.5 0 0 1 2.5-2.5h8.125"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </button>
          ))}
        </div>
      </aside>

      <section className="card orgs-workspace">
        <div className="orgs-workspace-header">
          <h3>{selectedOrg ? selectedOrg.name : "Organization workspace"}</h3>
          {selectedOrg ? (
            <div className="orgs-workspace-header-actions">
              <button
                className="button-inline"
                type="button"
                onClick={() => {
                  setRenameValue(selectedOrg.name);
                  setShowRenameModal(true);
                }}
              >
                Rename
              </button>
              <button
                className="danger button-inline"
                type="button"
                onClick={() => deleteOrg(selectedOrg.id, selectedOrg.name)}
              >
                Delete org
              </button>
            </div>
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

      {showRenameModal && selectedOrg ? (
        <div className="admin-modal-backdrop" onClick={() => setShowRenameModal(false)}>
          <div className="admin-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Rename organization</h3>
              <button className="button-inline" type="button" onClick={() => setShowRenameModal(false)}>
                Close
              </button>
            </div>
            <form onSubmit={renameOrg}>
              <label>
                Organization name
                <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required />
              </label>
              <button type="submit" disabled={renaming}>
                {renaming ? "Saving..." : "Save name"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="admin-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Create organization</h3>
              <button className="button-inline" type="button" onClick={() => setShowCreateModal(false)}>
                Close
              </button>
            </div>
            <form className="org-create-form" onSubmit={createOrg}>
              <label>
                Organization name
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <div className="org-create-admin-mode">
                <label>
                  <input
                    type="radio"
                    name="adminMode"
                    checked={adminMode === "existing"}
                    onChange={() => setAdminMode("existing")}
                  />
                  Use existing admin
                </label>
                <label>
                  <input type="radio" name="adminMode" checked={adminMode === "new"} onChange={() => setAdminMode("new")} />
                  Create new admin
                </label>
              </div>

              {adminMode === "existing" ? (
                <>
                  <label>
                    Find admin
                    <input
                      value={existingAdminSearch}
                      onChange={(event) => setExistingAdminSearch(event.target.value)}
                      placeholder="Search by username or email"
                    />
                  </label>
                  <label>
                    Select admin
                    <select
                      value={existingAdminUserId}
                      onChange={(event) => setExistingAdminUserId(event.target.value)}
                      required
                      disabled={loadingAdminsList}
                    >
                      <option value="">{loadingAdminsList ? "Loading admins..." : "Select an admin"}</option>
                      {filteredAvailableAdmins.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username} ({user.email})
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Initial admin username
                    <input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} required />
                  </label>
                  <label>
                    Initial admin email
                    <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required />
                  </label>
                </>
              )}

              <button type="submit">Create organization</button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
