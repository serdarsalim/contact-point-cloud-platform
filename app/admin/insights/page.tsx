import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId, isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { AdminNavbar } from "@/app/admin/_components/admin-navbar";
import { getTemplateInsights } from "@/lib/services/template-service";

function formatDateTime(value: Date | null) {
  if (!value) {
    return "Never";
  }

  return value.toLocaleString();
}

export default async function InsightsPage({
  searchParams
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.mustChangePassword) {
    redirect("/admin/change-password");
  }

  const { orgId: requestedOrgId } = await searchParams;

  const organizations = isSuperadmin(user)
    ? await prisma.organization.findMany({ orderBy: { name: "asc" } })
    : user.memberships.map((membership) => membership.organization);
  const superadmin = isSuperadmin(user);

  const defaultOrgId = organizations[0]?.id || getDefaultOrganizationId(user);
  const selectedOrgId =
    requestedOrgId && canAccessOrganization(user, requestedOrgId) ? requestedOrgId : defaultOrgId;
  const selectedOrganization = organizations.find((org) => org.id === selectedOrgId) || organizations[0] || null;

  if (!selectedOrganization) {
    return (
      <main className="admin-main">
        <AdminNavbar isSuperadmin={superadmin} userEmail={user.email} authMethod={user.authMethod} />
        <div className="card">
          <h1>No organization available</h1>
          <p>You do not have organization access for insights.</p>
        </div>
      </main>
    );
  }

  const insights = await getTemplateInsights(selectedOrganization.id);

  return (
    <main className="admin-main">
      <AdminNavbar
        isSuperadmin={superadmin}
        organizationName={selectedOrganization.name}
        organizationId={selectedOrganization.id}
        organizations={
          superadmin
            ? undefined
            : user.memberships.map((membership) => ({
                id: membership.organizationId,
                name: membership.organization.name
              }))
        }
        currentOrganizationId={selectedOrganization.id}
        userEmail={user.email}
        authMethod={user.authMethod}
      />
      <div className="insights-grid">
        <section className="card insights-overview-card">
          <div className="admin-card-header">
            <div>
              <h1>Insights</h1>
              <p className="insights-subtitle">Template usage across {selectedOrganization.name}.</p>
            </div>
          </div>
          <div className="insights-summary-grid">
            <div className="insights-summary-tile">
              <span>Templates used</span>
              <strong>
                {insights.usedTemplates.length} / {insights.templates.length}
              </strong>
            </div>
            <div className="insights-summary-tile">
              <span>Total uses</span>
              <strong>{insights.totalUsageCount}</strong>
            </div>
            <div className="insights-summary-tile">
              <span>Unused templates</span>
              <strong>{insights.unusedTemplates.length}</strong>
            </div>
            <div className="insights-summary-tile">
              <span>Most used</span>
              <strong>{insights.mostUsedTemplate ? insights.mostUsedTemplate.name : "No usage yet"}</strong>
            </div>
            <div className="insights-summary-tile">
              <span>Last activity</span>
              <strong>{insights.mostRecentTemplate ? formatDateTime(insights.mostRecentTemplate.lastUsedAt) : "Never"}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Top used templates</h3>
          {insights.topUsedTemplates.length === 0 ? <p>No template usage yet.</p> : null}
          {insights.topUsedTemplates.map((template, index) => (
            <div key={template.id} className="insights-list-row">
              <div>
                <strong>
                  {index + 1}. {template.name}
                </strong>
                <p>
                  {template.type} · Last used {formatDateTime(template.lastUsedAt)}
                </p>
              </div>
              <span className="insights-list-metric">{template.usageCount} uses</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h3>Recently used</h3>
          {insights.recentlyUsedTemplates.length === 0 ? <p>No recent activity yet.</p> : null}
          {insights.recentlyUsedTemplates.map((template) => (
            <div key={template.id} className="insights-list-row">
              <div>
                <strong>{template.name}</strong>
                <p>{template.type}</p>
              </div>
              <span className="insights-list-metric">{formatDateTime(template.lastUsedAt)}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h3>Unused templates</h3>
          {insights.unusedTemplates.length === 0 ? <p>Every template has been used at least once.</p> : null}
          {insights.unusedPreviewTemplates.map((template) => (
            <div key={template.id} className="insights-list-row">
              <div>
                <strong>{template.name}</strong>
                <p>{template.type}</p>
              </div>
              <span className="insights-list-metric">Unused</span>
            </div>
          ))}
          {insights.unusedTemplates.length > insights.unusedPreviewTemplates.length ? (
            <p className="insights-footer-note">
              {insights.unusedTemplates.length - insights.unusedPreviewTemplates.length} more unused templates not shown.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
