import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readBody } from "@/lib/request";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieConfig } from "@/lib/auth/session";
import { badRequest, tooManyRequests } from "@/lib/http";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const body = await readBody(request);
  const identifier = String(body.username || body.email || "").trim();
  const password = String(body.password || "");
  const ip = getClientIp(request);

  if (!identifier || !password) {
    return badRequest("Username/email and password are required");
  }

  const identifierKey = identifier.toLowerCase();
  const perIp = consumeRateLimit(`login:ip:${ip}`, { windowMs: 15 * 60 * 1000, max: 60 });
  if (!perIp.allowed) {
    return tooManyRequests("Too many login attempts. Try again later.", perIp.retryAfterSeconds);
  }

  const perUserIp = consumeRateLimit(`login:user:${identifierKey}:${ip}`, {
    windowMs: 15 * 60 * 1000,
    max: 12
  });
  if (!perUserIp.allowed) {
    return tooManyRequests("Too many login attempts. Try again later.", perUserIp.retryAfterSeconds);
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

  clearRateLimit(`login:user:${identifierKey}:${ip}`);

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
