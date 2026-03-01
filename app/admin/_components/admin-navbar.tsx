"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogoutButton } from "@/app/admin/_components/logout-button";

type NavbarOrganization = {
  id: string;
  name: string;
};

export function AdminNavbar({
  isSuperadmin,
  organizationName,
  organizationId,
  organizations,
  currentOrganizationId,
  userEmail
}: {
  isSuperadmin: boolean;
  organizationName?: string;
  organizationId?: string;
  organizations?: NavbarOrganization[];
  currentOrganizationId?: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const navOrganizations = organizations || [];
  const activeOrganizationId = currentOrganizationId || organizationId || navOrganizations[0]?.id;
  const activeOrganizationName =
    organizationName || navOrganizations.find((org) => org.id === activeOrganizationId)?.name;

  const manageOrgHref = activeOrganizationId ? `/admin/orgs/${activeOrganizationId}` : "/admin";
  const showManageOrgLink = !isSuperadmin || Boolean(organizationId);

  const isManageOrgActive =
    pathname === "/admin" || pathname.startsWith("/admin/users") || pathname.startsWith("/admin/orgs/");
  const isTemplatesActive = pathname.startsWith("/admin/templates");
  const isAllOrgsActive = pathname === "/admin/orgs";
  const isAllOrgsPage = isSuperadmin && pathname === "/admin/orgs";
  const hideOrgContextLinks = isSuperadmin && pathname === "/admin/orgs";
  const leftLabel = activeOrganizationName || (isAllOrgsPage ? "All orgs" : isSuperadmin ? "" : "Admin");
  const showOrgSwitcher = !isSuperadmin && navOrganizations.length > 1 && Boolean(activeOrganizationId);

  function getSwitchHref(targetOrgId: string) {
    if (pathname.startsWith("/admin/templates")) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("orgId", targetOrgId);
      return `/admin/templates?${next.toString()}`;
    }

    return `/admin/orgs/${targetOrgId}`;
  }

  return (
    <nav className="admin-navbar card" aria-label="Admin navigation">
      <div className="admin-navbar-inner">
        <div className="admin-navbar-org">
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
            leftLabel
          )}
        </div>
        <div className="admin-navbar-links">
          {isSuperadmin && !isAllOrgsPage ? (
            <Link className={`admin-nav-link ${isAllOrgsActive ? "active" : ""}`} href="/admin/orgs">
              All orgs
            </Link>
          ) : null}
          {showManageOrgLink ? (
            <Link className={`admin-nav-link ${isManageOrgActive ? "active" : ""}`} href={manageOrgHref}>
              Manage Org
            </Link>
          ) : null}
          {!hideOrgContextLinks ? (
            <Link className={`admin-nav-link ${isTemplatesActive ? "active" : ""}`} href="/admin/templates">
              Templates
            </Link>
          ) : null}
        </div>
        <div className="admin-navbar-account">
          <span>Signed in as {userEmail}</span>
          <LogoutButton variant="link" />
        </div>
      </div>
    </nav>
  );
}
