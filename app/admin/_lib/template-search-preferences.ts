export const TEMPLATE_SEARCH_TITLES_ONLY_STORAGE_KEY = "cp.admin.templates.searchTitlesOnly";
export const TEMPLATE_SEARCH_PREFERENCES_UPDATED_EVENT = "cp:template-search-preferences-updated";

export function readTemplateSearchTitlesOnlyPreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const rawValue = window.localStorage.getItem(TEMPLATE_SEARCH_TITLES_ONLY_STORAGE_KEY);
  if (rawValue === null) {
    return true;
  }

  return rawValue !== "false";
}

export function writeTemplateSearchTitlesOnlyPreference(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TEMPLATE_SEARCH_TITLES_ONLY_STORAGE_KEY, String(value));
  window.dispatchEvent(new CustomEvent(TEMPLATE_SEARCH_PREFERENCES_UPDATED_EVENT, { detail: { searchTitlesOnly: value } }));
}
