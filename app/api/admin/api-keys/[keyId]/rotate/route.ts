import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { canAccessOrganization } from "@/lib/auth/rbac";
import { forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { rotateApiKey } from "@/lib/services/api-key-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const { keyId } = await params;

  const key = await prisma.organizationApiKey.findUnique({ where: { id: keyId } });

  if (!key) {
    return notFound("API key not found");
  }

  if (!canAccessOrganization(auth.user, key.organizationId)) {
    return forbidden();
  }

  const rotated = await rotateApiKey({
    id: keyId,
    createdByUserId: auth.user.id
  });

  return NextResponse.json({
    apiKey: rotated.apiKey,
    token: rotated.rawToken,
    tokenReveal: "one-time"
  });
}
