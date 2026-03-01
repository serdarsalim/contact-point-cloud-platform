import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashApiToken } from "@/lib/tokens";

export async function authenticateExtensionRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      apiKey: null,
      error: NextResponse.json(
        { error: "Missing Authorization header.", code: "missing_authorization_header" },
        { status: 401 }
      )
    };
  }

  const [scheme, ...tokenParts] = authHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer") {
    return {
      apiKey: null,
      error: NextResponse.json(
        {
          error: "Authorization header must use Bearer token format.",
          code: "invalid_authorization_scheme"
        },
        { status: 401 }
      )
    };
  }

  const rawToken = tokenParts.join(" ").trim();

  if (!rawToken) {
    return {
      apiKey: null,
      error: NextResponse.json(
        { error: "Bearer token is empty.", code: "empty_bearer_token" },
        { status: 401 }
      )
    };
  }

  const tokenHash = hashApiToken(rawToken);

  const apiKey = await prisma.organizationApiKey.findFirst({
    where: {
      tokenHash,
      revokedAt: null
    },
    include: {
      organization: true
    }
  });

  if (!apiKey) {
    return {
      apiKey: null,
      error: NextResponse.json(
        { error: "Invalid or revoked API token.", code: "invalid_api_token" },
        { status: 401 }
      )
    };
  }

  await prisma.organizationApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return { apiKey, error: null };
}
