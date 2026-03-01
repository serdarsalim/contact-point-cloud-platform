import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashApiToken } from "@/lib/tokens";

export async function authenticateExtensionRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      apiKey: null,
      error: NextResponse.json({ error: "Missing bearer token" }, { status: 401 })
    };
  }

  const rawToken = authHeader.slice(7).trim();

  if (!rawToken) {
    return {
      apiKey: null,
      error: NextResponse.json({ error: "Invalid bearer token" }, { status: 401 })
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
      error: NextResponse.json({ error: "Unauthorized token" }, { status: 401 })
    };
  }

  await prisma.organizationApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return { apiKey, error: null };
}
