import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function isGoogleOauthEnabled() {
  return env.googleOauthEnabled();
}

export function createGoogleOauthState() {
  return randomBytes(24).toString("base64url");
}

export function getGoogleOauthRedirectUri() {
  return `${env.appUrl()}/api/auth/google/callback`;
}

export function createGoogleOauthUrl(state: string) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", env.googleClientId());
  url.searchParams.set("redirect_uri", getGoogleOauthRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      redirect_uri: getGoogleOauthRedirectUri(),
      grant_type: "authorization_code"
    }).toString()
  });

  const data = (await response.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Failed to exchange Google OAuth code");
  }

  return data.access_token;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  const data = (await response.json().catch(() => null)) as GoogleUserInfo | null;
  if (!response.ok || !data?.sub || !data?.email) {
    throw new Error("Failed to fetch Google user profile");
  }

  return data;
}
