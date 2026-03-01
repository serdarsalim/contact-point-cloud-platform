import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization, getDefaultOrganizationId } from "@/lib/auth/rbac";
import { badRequest, forbidden } from "@/lib/http";
import { readBody } from "@/lib/request";
import { createApiKey, listApiKeys } from "@/lib/services/api-key-service";

function resolveOrgId(userId: string | null, fallbackId: string | null) {
  return userId || fallbackId;
}

export async function GET(request: Request) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const url = new URL(request.url);
  const requestedOrgId = url.searchParams.get("orgId");
  const organizationId = resolveOrgId(requestedOrgId, getDefaultOrganizationId(auth.user));

  if (!organizationId) {
    return badRequest("orgId is required");
  }

  if (!canAccessOrganization(auth.user, organizationId)) {
    return forbidden();
  }

  const apiKeys = await listApiKeys(organizationId);
  return NextResponse.json({ apiKeys });
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readBody(request);
  const requestedOrgId = String(body.organizationId || "").trim();
  const organizationId = resolveOrgId(requestedOrgId, getDefaultOrganizationId(auth.user));
  const label = String(body.label || "").trim();
  const scopes = Array.isArray(body.scopes) ? body.scopes.map(String) : ["templates:read"];

  if (!organizationId || !label) {
    return badRequest("organizationId and label are required");
  }

  if (!canAccessOrganization(auth.user, organizationId)) {
    return forbidden();
  }

  const { apiKey, rawToken } = await createApiKey({
    organizationId,
    createdByUserId: auth.user.id,
    label,
    scopes
  });

  return NextResponse.json(
    {
      apiKey,
      token: rawToken,
      tokenReveal: "one-time"
    },
    { status: 201 }
  );
}
