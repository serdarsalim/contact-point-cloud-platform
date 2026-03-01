import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { sessionCookieConfig } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    ...sessionCookieConfig,
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0
  });

  return response;
}
