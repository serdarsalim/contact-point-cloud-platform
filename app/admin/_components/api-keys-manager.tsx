"use client";

import { FormEvent, useMemo, useState } from "react";

type Organization = {
  id: string;
  name: string;
};

type ApiKey = {
  id: string;
  organizationId: string;
  label: string;
  prefix: string;
  scopes: string[];
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export function ApiKeysManager({
  organizations,
  initialApiKeys
}: {
  organizations: Organization[];
  initialApiKeys: ApiKey[];
}) {
  const [selectedOrgId, setSelectedOrgId] = useState(organizations[0]?.id || "");
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [label, setLabel] = useState("");
  const [tokenReveal, setTokenReveal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => apiKeys.filter((key) => !selectedOrgId || key.organizationId === selectedOrgId),
    [apiKeys, selectedOrgId]
  );

  async function refresh(orgId: string) {
    const response = await fetch(`/api/admin/api-keys?orgId=${encodeURIComponent(orgId)}`);
    if (!response.ok) return;
    const data = (await response.json()) as { apiKeys: ApiKey[] };
    setApiKeys(data.apiKeys);
  }

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTokenReveal(null);

    const response = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: selectedOrgId, label, scopes: ["templates:read"] })
    });

    const data = (await response.json().catch(() => null)) as { token?: string; error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to create token");
      return;
    }

    setLabel("");
    setTokenReveal(data?.token || null);
    await refresh(selectedOrgId);
  }

  async function revoke(keyId: string) {
    const response = await fetch(`/api/admin/api-keys/${keyId}/revoke`, { method: "POST" });
    if (!response.ok) return;
    await refresh(selectedOrgId);
  }

  async function rotate(keyId: string) {
    const response = await fetch(`/api/admin/api-keys/${keyId}/rotate`, { method: "POST" });
    const data = (await response.json().catch(() => null)) as { token?: string } | null;

    if (!response.ok) return;

    setTokenReveal(data?.token || null);
    await refresh(selectedOrgId);
  }

  return (
    <div className="grid cols-2">
      <form className="card" onSubmit={createKey}>
        <h3>Create API token</h3>
        <label>
          Organization
          <select
            value={selectedOrgId}
            onChange={(event) => {
              const orgId = event.target.value;
              setSelectedOrgId(orgId);
              refresh(orgId);
            }}
            required
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Label (person/device)
          <input value={label} onChange={(event) => setLabel(event.target.value)} required />
        </label>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <button type="submit">Create token</button>
        {tokenReveal ? (
          <p>
            One-time token reveal: <code>{tokenReveal}</code>
          </p>
        ) : null}
      </form>

      <div className="card">
        <h3>Tokens</h3>
        {filtered.length === 0 ? <p>No tokens</p> : null}
        {filtered.map((key) => (
          <div key={key.id} style={{ marginBottom: "0.9rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.75rem" }}>
            <strong>{key.label}</strong> <code>{key.prefix}</code>
            <p style={{ margin: "0.15rem 0" }}>Scopes: {key.scopes.join(", ")}</p>
            <p style={{ margin: "0.15rem 0" }}>
              Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <p style={{ margin: 0 }}>Status: {key.revokedAt ? "Revoked" : "Active"}</p>
              <button className="secondary button-inline" type="button" onClick={() => rotate(key.id)}>
                Rotate
              </button>
              {!key.revokedAt ? (
                <button className="danger button-inline" type="button" onClick={() => revoke(key.id)}>
                  Revoke
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
