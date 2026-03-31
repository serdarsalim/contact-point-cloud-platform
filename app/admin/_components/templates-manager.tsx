"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

const searchFoldMap: Record<string, string> = {
  "\u0131": "i",
  "\u0130": "i",
  "\u015f": "s",
  "\u015e": "s",
  "\u00e7": "c",
  "\u00c7": "c",
  "\u011f": "g",
  "\u011e": "g",
  "\u00fc": "u",
  "\u00dc": "u",
  "\u00f6": "o",
  "\u00d6": "o"
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .replace(/[\u0131\u0130\u015f\u015e\u00e7\u00c7\u011f\u011e\u00fc\u00dc\u00f6\u00d6]/g, (char) => searchFoldMap[char] || char)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en");
}

function typePillClass(type: TemplateType): string {
  if (type === "EMAIL") return "type-pill type-pill-email";
  if (type === "WHATSAPP") return "type-pill type-pill-whatsapp";
  return "type-pill type-pill-note";
}

function templateTypeLabel(type: TemplateType): string {
  return type.toLowerCase();
}

function renderTemplateTypeIcon(type: TemplateType) {
  if (type === "EMAIL") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2"></rect>
        <path d="M3 7l9 6 9-6"></path>
      </svg>
    );
  }

  if (type === "WHATSAPP") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4c4.7 0 8.5 3.4 8.5 7.5S16.7 19 12 19c-1 0-2-.2-2.9-.5L4 20l1.4-3.8C4.5 14.9 4 13.2 4 11.5 4 7.4 7.8 4 12 4z"></path>
        <circle cx="9" cy="11.5" r="0.9"></circle>
        <circle cx="12" cy="11.5" r="0.9"></circle>
        <circle cx="15" cy="11.5" r="0.9"></circle>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 3h12l4 4v14H4z"></path>
      <path d="M16 3v4h4"></path>
      <path d="M8 12h8"></path>
      <path d="M8 16h8"></path>
    </svg>
  );
}

export function TemplatesManager({
  organizationId,
  initialTypeFilter = "ALL",
  initialTemplates,
}: {
  organizationId: string;
  initialTypeFilter?: TemplateTypeFilter;
  initialTemplates: Template[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [searchTitlesOnly, setSearchTitlesOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TemplateTypeFilter>(initialTypeFilter);
  const [showTypePickerModal, setShowTypePickerModal] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(initialTemplates[0]?.id || null);
  const [draft, setDraft] = useState<TemplateDraft>(
    initialTemplates[0] ? draftFromTemplate(initialTemplates[0]) : emptyDraft("EMAIL")
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const visibleTemplates = useMemo(() => {
    const query = normalizeSearchValue(search);

    return templates.filter((template) => {
      if (typeFilter !== "ALL" && template.type !== typeFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = searchTitlesOnly
        ? normalizeSearchValue(`${template.name} ${template.subject || ""}`)
        : normalizeSearchValue(`${template.name} ${template.subject || ""} ${template.body}`);
      return haystack.includes(query);
    });
  }, [templates, search, searchTitlesOnly, typeFilter]);

  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  useEffect(() => {
    if (visibleTemplates.length === 0) {
      setActiveTemplateId(null);
      setDraft(emptyDraft(typeFilter === "ALL" ? "EMAIL" : typeFilter));
      return;
    }

    const activeVisibleTemplate = visibleTemplates.find((template) => template.id === activeTemplateId);
    if (activeVisibleTemplate) {
      return;
    }

    const nextTemplate = visibleTemplates[0];
    setActiveTemplateId(nextTemplate.id);
    setDraft(draftFromTemplate(nextTemplate));
  }, [activeTemplateId, typeFilter, visibleTemplates]);

  function selectTemplate(template: Template) {
    setActiveTemplateId(template.id);
    setDraft(draftFromTemplate(template));
    setError(null);
    setStatus("");
  }

  function startNewTemplate() {
    setShowTypePickerModal(true);
    setError(null);
    setStatus("");
  }

  function beginCreateTemplate(type: TemplateType) {
    setActiveTemplateId(null);
    setDraft(emptyDraft(type));
    setError(null);
    setStatus("");
    setShowTypePickerModal(false);
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

    const confirmed = window.confirm(`Delete template "${draft.name}"?`);

    if (!confirmed) {
      return;
    }

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
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TemplateTypeFilter)}
              aria-label="Filter templates by type"
            >
              <option value="ALL">All templates</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="NOTE">Note</option>
            </select>
            <button className="button-inline" type="button" onClick={startNewTemplate}>
              New
            </button>
          </div>
          <div className="templates-search-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, subject, body"
              aria-label="Search templates"
            />
            <label className="templates-search-toggle">
              <input
                type="checkbox"
                checked={searchTitlesOnly}
                onChange={(event) => setSearchTitlesOnly(event.target.checked)}
              />
              <span>Title only</span>
            </label>
          </div>
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
                <span
                  className={`${typePillClass(template.type)} template-type-icon`}
                  role="img"
                  aria-label={`${template.type} template`}
                  title={template.type === "WHATSAPP" ? "WhatsApp" : template.type === "NOTE" ? "Note" : "Email"}
                >
                  {renderTemplateTypeIcon(template.type)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="templates-editor-pane card">
        <form className="templates-editor" onSubmit={saveTemplate}>
          <div className="templates-editor-top">
            <div>
              <h3>
                {draft.id
                  ? `Edit ${templateTypeLabel(draft.type)} template`
                  : `Create ${templateTypeLabel(draft.type)} template`}
              </h3>
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
              Name
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>

            {draft.type === "EMAIL" ? (
              <label className="templates-subject-field">
                Subject
                <input
                  value={draft.subject}
                  onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Email subject"
                />
              </label>
            ) : null}
          </div>

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
              className="templates-textarea templates-textarea-compact"
              value={draft.body}
              onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
              required
              rows={8}
              placeholder={`${draft.type} templates use plain text`}
            />
          )}

          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        </form>
      </section>

      {showTypePickerModal ? (
        <div className="admin-modal-backdrop" onClick={() => setShowTypePickerModal(false)}>
          <div className="admin-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Select template type</h3>
              <button
                className="secondary button-inline"
                type="button"
                onClick={() => setShowTypePickerModal(false)}
              >
                Close
              </button>
            </div>
            <div className="template-type-picker-grid">
              {typeOptions.map((option) => (
                <button
                  key={option}
                  className="template-type-picker-button"
                  type="button"
                  onClick={() => beginCreateTemplate(option)}
                >
                  {option === "WHATSAPP" ? "WhatsApp" : option === "NOTE" ? "Note" : "Email"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
