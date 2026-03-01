"use client";

import { FormEvent, useMemo, useState } from "react";
import { TinyMceEditor } from "@/app/admin/_components/tinymce-editor";

type Organization = {
  id: string;
  name: string;
};

type Template = {
  id: string;
  organizationId: string;
  type: "EMAIL" | "WHATSAPP" | "NOTE";
  name: string;
  subject: string | null;
  body: string;
};

const typeOptions = ["EMAIL", "WHATSAPP", "NOTE"] as const;

export function TemplatesManager({
  organizations,
  initialTemplates
}: {
  organizations: Organization[];
  initialTemplates: Template[];
}) {
  const [selectedOrgId, setSelectedOrgId] = useState(organizations[0]?.id || "");
  const [templates, setTemplates] = useState(initialTemplates);
  const [type, setType] = useState<(typeof typeOptions)[number]>("EMAIL");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => !selectedOrgId || template.organizationId === selectedOrgId),
    [templates, selectedOrgId]
  );

  async function refresh(orgId: string) {
    const response = await fetch(`/api/admin/templates?orgId=${encodeURIComponent(orgId)}`);
    if (!response.ok) return;
    const data = (await response.json()) as { templates: Template[] };
    setTemplates(data.templates);
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: selectedOrgId,
        type,
        name,
        subject: type === "EMAIL" ? subject || null : null,
        body
      })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to create template");
      return;
    }

    setName("");
    setSubject("");
    setBody("");
    await refresh(selectedOrgId);
  }

  async function deleteTemplate(templateId: string) {
    const response = await fetch(`/api/admin/templates/${templateId}`, {
      method: "DELETE"
    });
    if (!response.ok) return;
    await refresh(selectedOrgId);
  }

  return (
    <div className="grid cols-2">
      <form className="card" onSubmit={createTemplate}>
        <h3>Create template</h3>
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
          Type
          <select value={type} onChange={(event) => setType(event.target.value as (typeof typeOptions)[number])}>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Subject (email only)
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={type !== "EMAIL"}
            placeholder={type === "EMAIL" ? "Email subject" : "Only used for EMAIL templates"}
          />
        </label>
        <label>Body</label>
        {type === "EMAIL" ? (
          <div style={{ marginBottom: "0.75rem" }}>
            <TinyMceEditor value={body} onChange={setBody} />
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.9rem" }}>
              EMAIL templates support rich text, links, and image URLs.
            </p>
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            rows={6}
            placeholder={`${type} uses plain text`}
          />
        )}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <button type="submit">Create</button>
      </form>

      <div className="card">
        <h3>Templates</h3>
        {filteredTemplates.length === 0 ? <p>No templates</p> : null}
        {filteredTemplates.map((template) => (
          <div key={template.id} style={{ marginBottom: "0.75rem" }}>
            <strong>{template.name}</strong> <code>{template.type}</code>
            <p style={{ margin: "0.25rem 0" }}>{template.subject || "(no subject)"}</p>
            <button className="danger" type="button" onClick={() => deleteTemplate(template.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
