import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: string;
  exp: number;
};

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(input: string): string {
  return createHmac("sha256", env.authSessionSecret()).update(input).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };

  const payloadValue = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(payloadValue);
  return `${payloadValue}.${signature}`;
}

export function readSessionToken(token?: string | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [payloadValue, signature] = token.split(".");

  if (!payloadValue || !signature) {
    return null;
  }

  if (sign(payloadValue) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadValue)) as SessionPayload;

    if (!payload.userId || !payload.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieConfig = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS
};
