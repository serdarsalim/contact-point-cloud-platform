import { MembershipRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden } from "@/lib/http";
import { readBody } from "@/lib/request";
import { createUserWithGeneratedPassword, listUsersWithMemberships } from "@/lib/services/user-service";
import { writeAuditLog } from "@/lib/services/audit-service";

export async function GET() {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isSuperadmin(auth.user)) {
    return forbidden();
  }

  const users = await listUsersWithMemberships();
  return NextResponse.json({ users });
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
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim();
  const organizationId = body.organizationId ? String(body.organizationId).trim() : undefined;

  if (!username || !email || !organizationId) {
    return badRequest("username, email, and organizationId are required");
  }

  try {
    const { user, generatedPassword } = await createUserWithGeneratedPassword({
      username,
      email,
      organizationId,
      role: MembershipRole.ADMIN
    });

    await writeAuditLog({
      organizationId,
      actorUserId: auth.user.id,
      action: "org.admin.created",
      entityType: "User",
      entityId: user.id,
      metadata: { username: user.username, email: user.email }
    });

    return NextResponse.json(
      {
        user,
        generatedPassword,
        passwordReveal: "one-time"
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("Username or email already exists");
    }

    throw error;
  }
}
