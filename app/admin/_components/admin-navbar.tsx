"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/app/admin/_components/logout-button";

export function AdminNavbar({
  isSuperadmin,
  organizationName,
  organizationId,
  userEmail
}: {
  isSuperadmin: boolean;
  organizationName?: string;
  organizationId?: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const manageOrgHref = organizationId ? `/admin/orgs/${organizationId}` : "/admin";
  const showManageOrgLink = !isSuperadmin || Boolean(organizationId);

  const isManageOrgActive =
    pathname === "/admin" || pathname.startsWith("/admin/users") || pathname.startsWith("/admin/orgs/");
  const isTemplatesActive = pathname.startsWith("/admin/templates");
  const isAllOrgsActive = pathname === "/admin/orgs";
  const isAllOrgsPage = isSuperadmin && pathname === "/admin/orgs";
  const hideOrgContextLinks = isSuperadmin && pathname === "/admin/orgs";
  const leftLabel = organizationName || (isAllOrgsPage ? "All orgs" : isSuperadmin ? "" : "Admin");

  return (
    <nav className="admin-navbar card" aria-label="Admin navigation">
      <div className="admin-navbar-inner">
        <div className="admin-navbar-org">{leftLabel}</div>
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
