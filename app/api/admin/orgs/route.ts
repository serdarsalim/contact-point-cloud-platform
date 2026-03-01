import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden } from "@/lib/http";
import { readBody } from "@/lib/request";
import { createOrganizationWithInitialAdmin, listOrganizations } from "@/lib/services/org-service";
import { writeAuditLog } from "@/lib/services/audit-service";

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
  const adminUsername = body.adminUsername ? String(body.adminUsername).trim() : "";
  const adminEmail = body.adminEmail ? String(body.adminEmail).trim() : "";

  if (!name) {
    return badRequest("name is required");
  }

  if (!adminUsername || !adminEmail) {
    return badRequest("adminUsername and adminEmail are required");
  }

  try {
    const created = await createOrganizationWithInitialAdmin({
      name,
      slug: slug || undefined,
      adminUsername,
      adminEmail
    });

    await writeAuditLog({
      organizationId: created.organization.id,
      actorUserId: auth.user.id,
      action: "org.created",
      entityType: "Organization",
      entityId: created.organization.id,
      metadata: {
        name: created.organization.name,
        slug: created.organization.slug,
        initialAdminUserId: created.adminUser?.id || null
      }
    });

    return NextResponse.json(
      {
        organization: created.organization,
        adminUser: created.adminUser,
        membership: created.membership,
        generatedPassword: created.generatedPassword,
        passwordReveal: "one-time"
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("Organization slug/name or admin username/email must be unique");
    }

    throw error;
  }
}
