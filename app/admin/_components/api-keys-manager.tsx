"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

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
  initialApiKeys,
  onCountChange
}: {
  organizationId: string;
  initialApiKeys: ApiKey[];
  onCountChange?: (count: number) => void;
}) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [label, setLabel] = useState("");
  const [tokenReveal, setTokenReveal] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiKeys(initialApiKeys);
  }, [initialApiKeys, organizationId]);

  useEffect(() => {
    onCountChange?.(apiKeys.length);
  }, [apiKeys.length, onCountChange]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/admin/api-keys?orgId=${encodeURIComponent(organizationId)}`);
    if (!response.ok) return;
    const data = (await response.json()) as { apiKeys: ApiKey[] };
    setApiKeys(data.apiKeys);
  }, [organizationId]);

  useEffect(() => {
    void refresh();
    setTokenReveal(null);
    setError(null);
  }, [organizationId, refresh]);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTokenReveal(null);
    setCopyState("idle");

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
    setCopyState("idle");
    setShowCreateModal(false);
    await refresh();
  }

  async function rotate(keyId: string) {
    setError(null);

    const response = await fetch(`/api/admin/api-keys/${keyId}/rotate`, { method: "POST" });
    const data = (await response.json().catch(() => null)) as { token?: string; error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to rotate token");
      return;
    }

    setTokenReveal(data?.token || null);
    setCopyState("idle");
    await refresh();
  }

  async function deleteKey(keyId: string, labelValue: string) {
    const confirmed = window.confirm(
      `Delete token ${labelValue}? This permanently removes this row from the list.`
    );
    if (!confirmed) return;

    setError(null);

    const response = await fetch(`/api/admin/api-keys/${keyId}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to delete token");
      return;
    }

    await refresh();
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setLabel("");
    setError(null);
  }

  async function copyToken(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopyState("copied");
      } catch {
        setCopyState("error");
        return;
      }
    }

    setTimeout(() => {
      setCopyState("idle");
    }, 1500);
  }

  return (
    <>
      <div className="card api-keys-card">
        <div className="api-keys-header">
          <h3>Team template access</h3>
          <button className="button-inline" type="button" onClick={() => setShowCreateModal(true)}>
            Add access key
          </button>
        </div>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        {tokenReveal ? (
          <div className="api-key-reveal-row">
            <p style={{ margin: 0 }}>
              Copy this access key now. You will not be able to view it again: <code>{tokenReveal}</code>
            </p>
            <button
              className="api-key-action-link"
              type="button"
              onClick={() => copyToken(tokenReveal)}
              aria-label="Copy access key"
              title="Copy access key"
            >
              Copy key to clipboard
            </button>
            {copyState === "copied" ? <span className="api-key-copy-feedback">Copied</span> : null}
            {copyState === "error" ? <span className="api-key-copy-feedback error">Copy failed</span> : null}
          </div>
        ) : null}
        {apiKeys.length === 0 ? <p>No access keys yet.</p> : null}
        {apiKeys.length > 0 ? (
          <div className="api-keys-table">
            <div className="api-keys-row api-keys-row-head">
              <span>Access key</span>
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
                  <button
                    className="api-key-action-icon"
                    type="button"
                    onClick={() => rotate(key.id)}
                    aria-label="Rotate access key"
                    title="Rotate access key"
                  >
                    {"\u21bb"}
                  </button>
                  <button
                    className="api-key-delete-x"
                    type="button"
                    onClick={() => deleteKey(key.id, key.label)}
                    aria-label={`Delete access key ${key.label}`}
                    title="Delete access key"
                  >
                    ×
                  </button>
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
              <h3>Create access key</h3>
              <button className="secondary button-inline" type="button" onClick={closeCreateModal}>
                Close
              </button>
            </div>
            <form onSubmit={createKey}>
              <label>
                Label (person or device)
                <input value={label} onChange={(event) => setLabel(event.target.value)} required />
              </label>
              {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
              <button className="button-inline" type="submit">
                Create access key
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
