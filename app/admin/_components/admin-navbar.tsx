"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogoutButton } from "@/app/admin/_components/logout-button";

type NavbarOrganization = {
  id: string;
  name: string;
};

type TemplateNavType = "EMAIL" | "WHATSAPP" | "NOTE";

export function AdminNavbar({
  isSuperadmin,
  organizationName,
  organizationId,
  organizations,
  currentOrganizationId,
  userEmail,
  authMethod
}: {
  isSuperadmin: boolean;
  organizationName?: string;
  organizationId?: string;
  organizations?: NavbarOrganization[];
  currentOrganizationId?: string;
  userEmail: string;
  authMethod: "password" | "google";
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const navOrganizations = organizations || [];
  const activeOrganizationId = currentOrganizationId || organizationId || navOrganizations[0]?.id;
  const activeOrganizationName =
    organizationName || navOrganizations.find((org) => org.id === activeOrganizationId)?.name;

  const manageOrgHref = activeOrganizationId ? `/admin/orgs/${activeOrganizationId}` : "/admin";
  const templatesHref = activeOrganizationId ? `/admin/templates?orgId=${activeOrganizationId}` : "/admin/templates";
  const insightsHref = activeOrganizationId ? `/admin/insights?orgId=${activeOrganizationId}` : "/admin/insights";
  const showManageOrgLink = !isSuperadmin || Boolean(organizationId);

  const isManageOrgActive =
    pathname === "/admin" || pathname.startsWith("/admin/users") || pathname.startsWith("/admin/orgs/");
  const isTemplatesActive = pathname.startsWith("/admin/templates");
  const isInsightsActive = pathname.startsWith("/admin/insights");
  const isAllOrgsActive = pathname === "/admin/orgs";
  const isAllOrgsPage = isSuperadmin && pathname === "/admin/orgs";
  const hideOrgContextLinks = isSuperadmin && pathname === "/admin/orgs";
  const leftLabel = activeOrganizationName || (isAllOrgsPage ? "All orgs" : isSuperadmin ? "" : "Admin");
  const showOrgSwitcher = !isSuperadmin && navOrganizations.length > 1 && Boolean(activeOrganizationId);
  const activeTemplateType = searchParams.get("type") as TemplateNavType | null;
  const templateTypeLinks: Array<{ type: TemplateNavType; label: string }> = [
    { type: "EMAIL", label: "Email" },
    { type: "WHATSAPP", label: "WhatsApp" },
    { type: "NOTE", label: "Notes" }
  ];

  function getSwitchHref(targetOrgId: string) {
    if (pathname.startsWith("/admin/templates")) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("orgId", targetOrgId);
      return `/admin/templates?${next.toString()}`;
    }

    if (pathname.startsWith("/admin/insights")) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("orgId", targetOrgId);
      return `/admin/insights?${next.toString()}`;
    }

    return `/admin/orgs/${targetOrgId}`;
  }

  useEffect(() => {
    if (!settingsOpen) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

  return (
    <>
      <nav className="admin-navbar" aria-label="Admin navigation">
        <div className="admin-navbar-inner">
          <div className="admin-navbar-org">
            {isSuperadmin && !isAllOrgsPage ? (
              <Link className={`admin-nav-link ${isAllOrgsActive ? "active" : ""}`} href="/admin/orgs">
                All orgs
              </Link>
            ) : null}
            {showOrgSwitcher ? (
              <select
                aria-label="Switch organization"
                className="admin-org-switcher"
                value={activeOrganizationId}
                onChange={(event) => router.push(getSwitchHref(event.target.value))}
              >
                {navOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            ) : (
              <Link className="admin-navbar-org-link" href={manageOrgHref}>
                {leftLabel}
              </Link>
            )}
          </div>
          <div className="admin-navbar-links">
            {showManageOrgLink ? (
              <Link className={`admin-nav-link ${isManageOrgActive ? "active" : ""}`} href={manageOrgHref}>
                Workspace
              </Link>
            ) : null}
            {!hideOrgContextLinks
              ? templateTypeLinks.map((item) => (
                  <Link
                    key={item.type}
                    className={`admin-nav-link ${isTemplatesActive && activeTemplateType === item.type ? "active" : ""}`}
                    href={`${templatesHref}${templatesHref.includes("?") ? "&" : "?"}type=${item.type}`}
                  >
                    {item.label}
                  </Link>
                ))
              : null}
            {!hideOrgContextLinks ? (
              <Link className={`admin-nav-link ${isInsightsActive ? "active" : ""}`} href={insightsHref}>
                Insights
              </Link>
            ) : null}
          </div>
          <div className="admin-navbar-account">
            <span>{userEmail}</span>
            <button
              type="button"
              className="admin-settings-trigger"
              aria-label="Open account settings"
              onClick={() => setSettingsOpen(true)}
            >
              <span aria-hidden="true">⚙</span>
            </button>
          </div>
        </div>
      </nav>

      {settingsOpen ? (
        <div className="admin-settings-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="admin-settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-settings-head">
              <div>
                <p className="admin-settings-eyebrow">Account</p>
                <h3>Settings</h3>
              </div>
              <button
                type="button"
                className="admin-settings-close"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="admin-settings-email">{userEmail}</p>
            <div className="admin-settings-actions">
              {authMethod === "password" ? (
                <Link className="admin-settings-link" href="/admin/change-password" onClick={() => setSettingsOpen(false)}>
                  Change password
                </Link>
              ) : null}
              <LogoutButton variant="link" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
