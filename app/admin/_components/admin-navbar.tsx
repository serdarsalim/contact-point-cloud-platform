"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/app/admin/_components/logout-button";

export function AdminNavbar({
  isSuperadmin,
  organizationName,
  userEmail
}: {
  isSuperadmin: boolean;
  organizationName?: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  const isManageOrgActive =
    pathname === "/admin" || pathname.startsWith("/admin/users") || pathname.startsWith("/admin/orgs/");
  const isTemplatesActive = pathname.startsWith("/admin/templates");
  const isApiKeysActive = pathname.startsWith("/admin/api-keys");
  const isAllOrgsActive = pathname === "/admin/orgs";
  const leftLabel = organizationName || (isSuperadmin ? "Superadmin" : "Admin");

  return (
    <nav className="admin-navbar card" aria-label="Admin navigation">
      <div className="admin-navbar-inner">
        <div className="admin-navbar-org">{leftLabel}</div>
        <div className="admin-navbar-links">
          <Link className={`admin-nav-link ${isManageOrgActive ? "active" : ""}`} href="/admin">
            Manage Org
          </Link>
          <Link className={`admin-nav-link ${isTemplatesActive ? "active" : ""}`} href="/admin/templates">
            Templates
          </Link>
          <Link className={`admin-nav-link ${isApiKeysActive ? "active" : ""}`} href="/admin/api-keys">
            API tokens
          </Link>
          {isSuperadmin ? (
            <Link className={`admin-nav-link ${isAllOrgsActive ? "active" : ""}`} href="/admin/orgs">
              All orgs
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
