import { MembershipRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { badRequest, forbidden } from "@/lib/http";
import { readBody } from "@/lib/request";
import { createUserWithGeneratedPassword, listUsersWithMemberships } from "@/lib/services/user-service";

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
  const role = body.role ? String(body.role).toUpperCase() : MembershipRole.ADMIN;

  if (!username || !email) {
    return badRequest("username and email are required");
  }

  if (organizationId && ![MembershipRole.ADMIN, MembershipRole.SUPERADMIN].includes(role as MembershipRole)) {
    return badRequest("role must be ADMIN or SUPERADMIN");
  }

  try {
    const { user, generatedPassword } = await createUserWithGeneratedPassword({
      username,
      email,
      organizationId,
      role: role as MembershipRole
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
