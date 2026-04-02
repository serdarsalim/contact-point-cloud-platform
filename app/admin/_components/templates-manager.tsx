"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  readTemplateSearchTitlesOnlyPreference,
  TEMPLATE_SEARCH_PREFERENCES_UPDATED_EVENT
} from "@/app/admin/_lib/template-search-preferences";
import { TinyMceEditor } from "@/app/admin/_components/tinymce-editor";

type TemplateType = "EMAIL" | "WHATSAPP" | "NOTE";
type TemplateTypeFilter = "ALL" | TemplateType;

type Template = {
  id: string;
  organizationId: string;
  type: TemplateType;
  position: number;
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

function templateTypeLabel(type: TemplateType): string {
  return type.toLowerCase();
}

function templateTypeButtonLabel(type: TemplateType): string {
  if (type === "EMAIL") return "New Email";
  if (type === "WHATSAPP") return "New WhatsApp";
  return "New Note";
}

function compareTemplates(a: Template, b: Template) {
  if (a.type !== b.type) {
    return a.type.localeCompare(b.type);
  }

  if (a.position !== b.position) {
    return a.position - b.position;
  }

  return a.name.localeCompare(b.name);
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
  const [searchTitlesOnly, setSearchTitlesOnly] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TemplateTypeFilter>(initialTypeFilter);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(initialTemplates[0]?.id || null);
  const [draft, setDraft] = useState<TemplateDraft>(
    initialTemplates[0] ? draftFromTemplate(initialTemplates[0]) : emptyDraft("EMAIL")
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  const [dragOverTemplateId, setDragOverTemplateId] = useState<string | null>(null);
  const plainTextBodyRef = useRef<HTMLTextAreaElement | null>(null);

  const visibleTemplates = useMemo(() => {
    const query = normalizeSearchValue(search);

    return templates
      .filter((template) => {
        if (typeFilter !== "ALL" && template.type !== typeFilter) {
          return false;
        }
        if (!query) return true;
        const haystack = searchTitlesOnly
          ? normalizeSearchValue(`${template.name} ${template.subject || ""}`)
          : normalizeSearchValue(`${template.name} ${template.subject || ""} ${template.body}`);
        return haystack.includes(query);
      })
      .sort(compareTemplates);
  }, [templates, search, searchTitlesOnly, typeFilter]);

  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  useEffect(() => {
    setSearchTitlesOnly(readTemplateSearchTitlesOnlyPreference());

    function syncSearchPreference() {
      setSearchTitlesOnly(readTemplateSearchTitlesOnlyPreference());
    }

    window.addEventListener("storage", syncSearchPreference);
    window.addEventListener(TEMPLATE_SEARCH_PREFERENCES_UPDATED_EVENT, syncSearchPreference);

    return () => {
      window.removeEventListener("storage", syncSearchPreference);
      window.removeEventListener(TEMPLATE_SEARCH_PREFERENCES_UPDATED_EVENT, syncSearchPreference);
    };
  }, []);

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

  useEffect(() => {
    if (!plainTextBodyRef.current || draft.type === "EMAIL") {
      return;
    }

    plainTextBodyRef.current.style.height = "0px";
    plainTextBodyRef.current.style.height = `${plainTextBodyRef.current.scrollHeight}px`;
  }, [draft.body, draft.type]);

  function selectTemplate(template: Template) {
    setActiveTemplateId(template.id);
    setDraft(draftFromTemplate(template));
    setError(null);
    setStatus("");
  }

  function beginCreateTemplate(type: TemplateType) {
    setActiveTemplateId(null);
    setDraft(emptyDraft(type));
    setError(null);
    setStatus("");
  }

  const createActions: TemplateType[] =
    typeFilter === "ALL" ? ["EMAIL", "WHATSAPP", "NOTE"] : [typeFilter];
  const canReorder = typeFilter !== "ALL" && search.trim().length === 0;
  const activeVisibleTemplateIndex = visibleTemplates.findIndex((template) => template.id === activeTemplateId);

  function selectRelativeTemplate(direction: -1 | 1) {
    if (visibleTemplates.length === 0) {
      return;
    }

    const currentIndex = activeVisibleTemplateIndex >= 0 ? activeVisibleTemplateIndex : 0;
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= visibleTemplates.length) {
      return;
    }

    selectTemplate(visibleTemplates[nextIndex]);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable === true ||
        target?.closest(".tox") !== null;

      if (isTypingTarget) {
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        selectRelativeTemplate(-1);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectRelativeTemplate(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeVisibleTemplateIndex, visibleTemplates]);

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

  async function persistTemplateOrder(reorderedIds: string[]) {
    if (typeFilter === "ALL") {
      return;
    }

    const nextTemplates = templates.map((template) => {
      if (template.type !== typeFilter) {
        return template;
      }

      const nextPosition = reorderedIds.indexOf(template.id);
      return {
        ...template,
        position: nextPosition + 1
      };
    });

    setTemplates(nextTemplates);
    setStatus("");
    setError(null);
    setIsReordering(true);

    try {
      const response = await fetch("/api/admin/templates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          type: typeFilter,
          orderedTemplateIds: reorderedIds
        })
      });

      const data = (await response.json().catch(() => null)) as { error?: string; templates?: Template[] } | null;

      if (!response.ok || !data?.templates) {
        setError(data?.error || "Failed to reorder templates");
        await refresh();
        return;
      }

      setTemplates((previousTemplates) => {
        const reorderedById = new Map(data.templates?.map((template) => [template.id, template]));
        return previousTemplates.map((template) => reorderedById.get(template.id) || template);
      });
      setStatus("Order saved");
    } catch {
      setError("Failed to reorder templates");
      await refresh();
    } finally {
      setIsReordering(false);
    }
  }

  function moveDraggedTemplate(targetTemplateId: string) {
    if (!canReorder || !draggedTemplateId || draggedTemplateId === targetTemplateId) {
      return;
    }

    const typeTemplates = templates.filter((template) => template.type === typeFilter);
    const draggedIndex = typeTemplates.findIndex((template) => template.id === draggedTemplateId);
    const targetIndex = typeTemplates.findIndex((template) => template.id === targetTemplateId);

    if (draggedIndex < 0 || targetIndex < 0) {
      return;
    }

    const reorderedTypeTemplates = [...typeTemplates];
    const [movedTemplate] = reorderedTypeTemplates.splice(draggedIndex, 1);
    reorderedTypeTemplates.splice(targetIndex, 0, movedTemplate);

    setDraggedTemplateId(null);
    setDragOverTemplateId(null);
    void persistTemplateOrder(reorderedTypeTemplates.map((template) => template.id));
  }

  return (
    <div className="templates-workspace">
      <aside className="templates-sidebar card">
        <div className="templates-sidebar-head">
          <div className="templates-sidebar-actions">
            {createActions.map((type) => (
              <button key={type} className="button-inline" type="button" onClick={() => beginCreateTemplate(type)}>
                {templateTypeButtonLabel(type)}
              </button>
            ))}
          </div>
          <div className="templates-search-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, subject, body"
              aria-label="Search templates"
            />
          </div>
        </div>

        <div className="templates-list">
          {visibleTemplates.length === 0 ? <p className="templates-empty">No templates found.</p> : null}
          {visibleTemplates.map((template) => (
            <div
              key={template.id}
              className={`template-list-item ${template.id === activeTemplateId ? "active" : ""} ${
                dragOverTemplateId === template.id ? "drag-over" : ""
              }`}
              draggable={canReorder && !isReordering}
              onDragStart={(event) => {
                if (!canReorder) return;
                setDraggedTemplateId(template.id);
                setDragOverTemplateId(null);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", template.id);
              }}
              onDragOver={(event) => {
                if (!canReorder || draggedTemplateId === template.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverTemplateId(template.id);
              }}
              onDragLeave={() => {
                if (dragOverTemplateId === template.id) {
                  setDragOverTemplateId(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                moveDraggedTemplate(template.id);
              }}
              onDragEnd={() => {
                setDraggedTemplateId(null);
                setDragOverTemplateId(null);
              }}
            >
              <button type="button" className="template-list-select" onClick={() => selectTemplate(template)}>
                <span className="template-list-item-head">
                  <span className="template-list-name">{template.name}</span>
                  {canReorder ? (
                    <span className="template-drag-handle" aria-hidden="true">
                      :::
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
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
              ref={plainTextBodyRef}
              className="templates-textarea templates-textarea-compact"
              value={draft.body}
              onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
              required
              rows={1}
              placeholder={`${draft.type} templates use plain text`}
            />
          )}

          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        </form>
      </section>
    </div>
  );
}
