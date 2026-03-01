"use client";

import { FormEvent, useState } from "react";

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
  organizationId,
  initialApiKeys
}: {
  organizationId: string;
  initialApiKeys: ApiKey[];
}) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [label, setLabel] = useState("");
  const [tokenReveal, setTokenReveal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/admin/api-keys?orgId=${encodeURIComponent(organizationId)}`);
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
      body: JSON.stringify({ organizationId, label, scopes: ["templates:read"] })
    });

    const data = (await response.json().catch(() => null)) as { token?: string; error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to create token");
      return;
    }

    setLabel("");
    setTokenReveal(data?.token || null);
    setShowCreateModal(false);
    await refresh();
  }

  async function revoke(keyId: string) {
    const response = await fetch(`/api/admin/api-keys/${keyId}/revoke`, { method: "POST" });
    if (!response.ok) return;
    await refresh();
  }

  async function rotate(keyId: string) {
    const response = await fetch(`/api/admin/api-keys/${keyId}/rotate`, { method: "POST" });
    const data = (await response.json().catch(() => null)) as { token?: string } | null;

    if (!response.ok) return;

    setTokenReveal(data?.token || null);
    await refresh();
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setLabel("");
    setError(null);
  }

  return (
    <>
      <div className="card api-keys-card">
        <div className="api-keys-header">
          <h3>Tokens</h3>
          <button className="button-inline" type="button" onClick={() => setShowCreateModal(true)}>
            + New Token
          </button>
        </div>
        {tokenReveal ? (
          <p>
            One-time token reveal: <code>{tokenReveal}</code>
          </p>
        ) : null}
        {apiKeys.length === 0 ? <p>No tokens</p> : null}
        {apiKeys.length > 0 ? (
          <div className="api-keys-table">
            <div className="api-keys-row api-keys-row-head">
              <span>Name</span>
              <span>Last used</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {apiKeys.map((key) => (
              <div key={key.id} className="api-keys-row">
                <div className="api-keys-name-cell">
                  <strong>{key.label}</strong> <code>{key.prefix}</code>
                </div>
                <span>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</span>
                <span>{key.revokedAt ? "Revoked" : "Active"}</span>
                <div className="api-keys-actions-cell">
                  <button className="api-key-action-link" type="button" onClick={() => rotate(key.id)}>
                    Rotate
                  </button>
                  {!key.revokedAt ? (
                    <button
                      className="api-key-action-link api-key-action-link-danger"
                      type="button"
                      onClick={() => revoke(key.id)}
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showCreateModal ? (
        <div className="admin-modal-backdrop" onClick={closeCreateModal}>
          <div className="admin-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Create API token</h3>
              <button className="secondary button-inline" type="button" onClick={closeCreateModal}>
                Close
              </button>
            </div>
            <form onSubmit={createKey}>
              <label>
                Label (person/device)
                <input value={label} onChange={(event) => setLabel(event.target.value)} required />
              </label>
              {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
              <button className="button-inline" type="submit">
                Create token
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
