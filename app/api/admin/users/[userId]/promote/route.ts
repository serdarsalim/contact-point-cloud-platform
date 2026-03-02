import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { isSuperadmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { writeAuditLog } from "@/lib/services/audit-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireSessionUser();

  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isSuperadmin(auth.user)) {
    return forbidden("Only SUPERADMIN can promote users");
  }

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    return notFound("User not found");
  }

  if (user.role === UserRole.SUPERADMIN) {
    return badRequest("User is already SUPERADMIN");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: UserRole.SUPERADMIN }
    });

    await tx.organizationMember.deleteMany({
      where: { userId: user.id }
    });
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "user.promoted_to_superadmin",
    entityType: "User",
    entityId: user.id,
    metadata: {
      username: user.username,
      email: user.email
    }
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: UserRole.SUPERADMIN
    }
  });
}
