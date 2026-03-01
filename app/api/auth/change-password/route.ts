import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readBody } from "@/lib/request";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { badRequest } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth/admin-auth";
import { writeAuditLog } from "@/lib/services/audit-service";

export async function POST(request: Request) {
  const auth = await requireSessionUser({ allowPasswordChangePending: true });

  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await readBody(request);
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return badRequest("currentPassword, newPassword, and confirmPassword are required");
  }

  if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  if (newPassword.length < 10) {
    return badRequest("New password must be at least 10 characters long");
  }

  if (newPassword !== confirmPassword) {
    return badRequest("New password confirmation does not match");
  }

  if (verifyPassword(newPassword, auth.user.passwordHash)) {
    return badRequest("New password must be different from current password");
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false
    }
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "user.password.changed",
    entityType: "User",
    entityId: auth.user.id,
    metadata: { forcedChange: auth.user.mustChangePassword }
  });

  return NextResponse.json({ ok: true });
}
