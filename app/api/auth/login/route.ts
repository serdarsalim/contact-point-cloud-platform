import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readBody } from "@/lib/request";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieConfig } from "@/lib/auth/session";
import { badRequest } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readBody(request);
  const identifier = String(body.username || body.email || "").trim();
  const password = String(body.password || "");

  if (!identifier || !password) {
    return badRequest("Username/email and password are required");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier.toLowerCase() }]
    },
    include: {
      memberships: true
    }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      memberships: user.memberships
    }
  });

  response.cookies.set({
    ...sessionCookieConfig,
    value: createSessionToken(user.id)
  });

  return response;
}
