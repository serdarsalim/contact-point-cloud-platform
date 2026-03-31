import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GOOGLE_OAUTH_STATE_COOKIE_NAME } from "@/lib/auth/constants";
import { exchangeGoogleCode, fetchGoogleUserInfo, isGoogleOauthEnabled } from "@/lib/auth/google-oauth";
import { createSessionToken, sessionCookieConfig } from "@/lib/auth/session";
import { env } from "@/lib/env";

function redirectToLogin(error: string) {
  return NextResponse.redirect(new URL(`/admin/login?error=${error}`, env.appUrl()));
}

export async function GET(request: Request) {
  if (!isGoogleOauthEnabled()) {
    return redirectToLogin("google_not_configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    const response = redirectToLogin("google_invalid_state");
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE_NAME);
    return response;
  }

  try {
    const accessToken = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserInfo(accessToken);

    if (!profile.email_verified) {
      const response = redirectToLogin("google_unverified_email");
      response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE_NAME);
      return response;
    }

    const normalizedEmail = profile.email.toLowerCase();
    const userByGoogleSubject = await prisma.user.findUnique({
      where: { googleSubject: profile.sub }
    });
    const userByEmail = userByGoogleSubject
      ? null
      : await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
    const existingUser = userByGoogleSubject || userByEmail;

    if (!existingUser) {
      const response = redirectToLogin("google_no_access");
      response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE_NAME);
      return response;
    }

    const user = existingUser.googleSubject
      ? existingUser
      : await prisma.user.update({
          where: { id: existingUser.id },
          data: { googleSubject: profile.sub }
        });

    const response = NextResponse.redirect(new URL("/admin", env.appUrl()));
    response.cookies.set({
      ...sessionCookieConfig,
      value: createSessionToken(user.id, "google")
    });
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE_NAME);
    return response;
  } catch {
    const response = redirectToLogin("google_sign_in_failed");
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE_NAME);
    return response;
  }
}
