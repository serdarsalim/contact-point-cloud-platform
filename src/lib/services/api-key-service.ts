import { prisma } from "@/lib/db";
import { generateApiToken } from "@/lib/tokens";

const ALLOWED_SCOPES = ["templates:read"];

function sanitizeScopes(scopes?: string[]) {
  if (!scopes || scopes.length === 0) {
    return ALLOWED_SCOPES;
  }

  const unique = Array.from(new Set(scopes));
  return unique.filter((scope) => ALLOWED_SCOPES.includes(scope));
}

export async function listApiKeys(organizationId: string) {
  return prisma.organizationApiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" }
  });
}

export async function createApiKey(input: {
  organizationId: string;
  createdByUserId: string;
  label: string;
  scopes?: string[];
}) {
  const generated = generateApiToken();
  const scopes = sanitizeScopes(input.scopes);

  const apiKey = await prisma.organizationApiKey.create({
    data: {
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
      label: input.label.trim(),
      prefix: generated.prefix,
      tokenHash: generated.tokenHash,
      scopes
    }
  });

  return {
    apiKey,
    rawToken: generated.token
  };
}

export async function revokeApiKey(id: string) {
  return prisma.organizationApiKey.update({
    where: { id },
    data: {
      revokedAt: new Date()
    }
  });
}

export async function deleteApiKey(id: string) {
  return prisma.organizationApiKey.delete({
    where: { id }
  });
}

export async function rotateApiKey(input: { id: string; createdByUserId: string }) {
  const existing = await prisma.organizationApiKey.findUnique({
    where: { id: input.id }
  });

  if (!existing) {
    throw new Error("API token not found");
  }

  const generated = generateApiToken();

  const rotated = await prisma.$transaction(async (tx) => {
    const created = await tx.organizationApiKey.create({
      data: {
        organizationId: existing.organizationId,
        createdByUserId: input.createdByUserId,
        label: existing.label,
        prefix: generated.prefix,
        tokenHash: generated.tokenHash,
        scopes: existing.scopes
      }
    });

    await tx.organizationApiKey.delete({
      where: { id: existing.id }
    });

    return created;
  });

  return {
    apiKey: rotated,
    rawToken: generated.token
  };
}
