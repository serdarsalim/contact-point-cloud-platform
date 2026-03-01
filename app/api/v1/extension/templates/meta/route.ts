import { NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/auth/extension-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);

  if (auth.error || !auth.apiKey) {
    return auth.error;
  }

  const [aggregate, templateCount] = await Promise.all([
    prisma.template.aggregate({
      where: { organizationId: auth.apiKey.organizationId },
      _max: { updatedAt: true }
    }),
    prisma.template.count({
      where: { organizationId: auth.apiKey.organizationId }
    })
  ]);

  return NextResponse.json({
    organizationId: auth.apiKey.organizationId,
    source: "cloud",
    templateCount,
    latestUpdatedAt: aggregate._max.updatedAt ? aggregate._max.updatedAt.toISOString() : null
  });
}
