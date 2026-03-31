import { NextResponse } from "next/server";
import { GOOGLE_OAUTH_STATE_COOKIE_NAME } from "@/lib/auth/constants";
import { createGoogleOauthState, createGoogleOauthUrl, isGoogleOauthEnabled } from "@/lib/auth/google-oauth";
import { env } from "@/lib/env";

export async function GET() {
  if (!isGoogleOauthEnabled()) {
    return NextResponse.redirect(new URL("/admin/login?error=google_not_configured", env.appUrl()));
  }

  const state = createGoogleOauthState();
  const response = NextResponse.redirect(createGoogleOauthUrl(state));

  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE_NAME,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  return response;
}
