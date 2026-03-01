"use client";

import { FormEvent, useMemo, useState } from "react";
import { TinyMceEditor } from "@/app/admin/_components/tinymce-editor";

type TemplateType = "EMAIL" | "WHATSAPP" | "NOTE";
type TemplateTypeFilter = "ALL" | TemplateType;

type Template = {
  id: string;
  organizationId: string;
  type: TemplateType;
  name: string;
  subject: string | null;
  body: string;
};

type TemplateDraft = {
  id: string | null;
  type: TemplateType;
  name: string;
  subject: string;
  body: string;
};

const typeOptions: TemplateType[] = ["EMAIL", "WHATSAPP", "NOTE"];

function emptyDraft(type: TemplateType = "EMAIL"): TemplateDraft {
  return {
    id: null,
    type,
    name: "",
    subject: "",
    body: ""
  };
}

function draftFromTemplate(template: Template): TemplateDraft {
  return {
    id: template.id,
    type: template.type,
    name: template.name,
    subject: template.subject || "",
    body: template.body
  };
}

function typePillClass(type: TemplateType): string {
  if (type === "EMAIL") return "type-pill type-pill-email";
  if (type === "WHATSAPP") return "type-pill type-pill-whatsapp";
  return "type-pill type-pill-note";
}

export function TemplatesManager({
  organizationId,
  initialTemplates,
}: {
  organizationId: string;
  initialTemplates: Template[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TemplateTypeFilter>("ALL");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(initialTemplates[0]?.id || null);
  const [draft, setDraft] = useState<TemplateDraft>(
    initialTemplates[0] ? draftFromTemplate(initialTemplates[0]) : emptyDraft("EMAIL")
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (typeFilter !== "ALL" && template.type !== typeFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = `${template.name} ${template.subject || ""} ${template.body}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [templates, search, typeFilter]);

  function selectTemplate(template: Template) {
    setActiveTemplateId(template.id);
    setDraft(draftFromTemplate(template));
    setError(null);
    setStatus("");
  }

  function startNewTemplate() {
    const nextType = draft.type || "EMAIL";
    setActiveTemplateId(null);
    setDraft(emptyDraft(nextType));
    setError(null);
    setStatus("Creating new template");
  }

  async function refresh(): Promise<Template[] | null> {
    const response = await fetch(`/api/admin/templates?orgId=${encodeURIComponent(organizationId)}`);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Failed to load templates");
      return null;
    }

    const data = (await response.json()) as { templates: Template[] };
    setTemplates(data.templates);

    if (data.templates.length === 0) {
      setActiveTemplateId(null);
      setDraft(emptyDraft("EMAIL"));
      setStatus("");
      return data.templates;
    }

    const current = data.templates.find((template) => template.id === activeTemplateId) || data.templates[0];
    setActiveTemplateId(current.id);
    setDraft(draftFromTemplate(current));
    setStatus("");
    return data.templates;
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const payload = {
      organizationId,
      type: draft.type,
      name: draft.name,
      subject: draft.type === "EMAIL" ? draft.subject || null : null,
      body: draft.body
    };

    if (!payload.name.trim() || !payload.body.trim()) {
      setError("Organization, name, and body are required");
      setIsSaving(false);
      return;
    }

    const endpoint = draft.id ? `/api/admin/templates/${draft.id}` : "/api/admin/templates";
    const method = draft.id ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; template?: Template }
      | null;

    if (!response.ok) {
      setError(data?.error || "Failed to save template");
      setStatus("Save failed");
      setIsSaving(false);
      return;
    }

    const refreshed = await refresh();

    const templateId = data?.template?.id || draft.id;
    if (templateId && refreshed) {
      const updated = refreshed.find((template) => template.id === templateId);
      if (updated) {
        setActiveTemplateId(updated.id);
        setDraft(draftFromTemplate(updated));
      }
    }

    setStatus(draft.id ? "Saved" : "Created");
    setIsSaving(false);
  }

  async function deleteTemplate() {
    if (!draft.id) return;

    setError(null);

    const response = await fetch(`/api/admin/templates/${draft.id}`, {
      method: "DELETE"
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(data?.error || "Failed to delete template");
      return;
    }

    await refresh();
    setStatus("Deleted");
  }

  return (
    <div className="templates-workspace">
      <aside className="templates-sidebar card">
        <div className="templates-sidebar-head">
          <div className="templates-sidebar-actions">
            <button className="button-inline" type="button" onClick={startNewTemplate}>
              New
            </button>
          </div>
          <label>
            Filter by type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TemplateTypeFilter)}
            >
              <option value="ALL">All</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="NOTE">Note</option>
            </select>
          </label>
          <label>
            Search templates
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, subject, body"
            />
          </label>
        </div>

        <div className="templates-list">
          {visibleTemplates.length === 0 ? <p className="templates-empty">No templates found.</p> : null}
          {visibleTemplates.map((template) => (
            <button
              key={template.id}
              className={`template-list-item ${template.id === activeTemplateId ? "active" : ""}`}
              type="button"
              onClick={() => selectTemplate(template)}
            >
              <span className="template-list-item-head">
                <span className="template-list-name">{template.name}</span>
                <span className={typePillClass(template.type)}>{template.type}</span>
              </span>
              <span className="template-list-preview">{template.subject || template.body.slice(0, 80) || "No content"}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="templates-editor-pane card">
        <form className="templates-editor" onSubmit={saveTemplate}>
          <div className="templates-editor-top">
            <div>
              <h3>{draft.id ? "Edit template" : "Create template"}</h3>
              <p className="templates-editor-status">{status}</p>
            </div>
            <div className="templates-editor-actions">
              {draft.id ? (
                <button className="danger button-inline" type="button" onClick={deleteTemplate}>
                  Delete
                </button>
              ) : null}
              <button className="button-inline" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : draft.id ? "Save" : "Create"}
              </button>
            </div>
          </div>

          <div className="templates-meta-grid">
            <label>
              Type
              <select
                value={draft.type}
                onChange={(event) => {
                  const nextType = event.target.value as TemplateType;
                  setDraft((prev) => ({
                    ...prev,
                    type: nextType,
                    subject: nextType === "EMAIL" ? prev.subject : ""
                  }));
                }}
              >
                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Name
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>

            <label>
              Subject (email only)
              <input
                value={draft.subject}
                onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
                disabled={draft.type !== "EMAIL"}
                placeholder={draft.type === "EMAIL" ? "Email subject" : "Only for EMAIL"}
              />
            </label>
          </div>

          <label>Body</label>
          {draft.type === "EMAIL" ? (
            <div className="templates-body-editor">
              <TinyMceEditor
                value={draft.body}
                onChange={(value) => setDraft((prev) => ({ ...prev, body: value }))}
                height={1400}
              />
            </div>
          ) : (
            <textarea
              className="templates-textarea"
              value={draft.body}
              onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
              required
              rows={14}
              placeholder={`${draft.type} templates use plain text`}
            />
          )}

          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        </form>
      </section>
    </div>
  );
}
