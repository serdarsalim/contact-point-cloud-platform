import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden } from "@/lib/http";
import { readBody } from "@/lib/request";
import { createOrganization, listOrganizations } from "@/lib/services/org-service";

export async function GET() {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isSuperadmin(auth.user)) {
    return forbidden();
  }

  const organizations = await listOrganizations();
  return NextResponse.json({ organizations });
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isSuperadmin(auth.user)) {
    return forbidden();
  }

  const body = await readBody(request);
  const name = String(body.name || "").trim();
  const slug = String(body.slug || "").trim();

  if (!name) {
    return badRequest("name is required");
  }

  try {
    const organization = await createOrganization({ name, slug: slug || undefined });
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("Organization name or slug must be unique");
    }

    throw error;
  }
}
