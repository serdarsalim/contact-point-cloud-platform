import { createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

export type GeneratedApiToken = {
  token: string;
  tokenHash: string;
  prefix: string;
};

export function hashApiToken(rawToken: string): string {
  return createHmac("sha256", env.tokenHashSalt()).update(rawToken).digest("hex");
}

export function generateApiToken(): GeneratedApiToken {
  const prefix = randomBytes(4).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const token = `cpt_${prefix}_${secret}`;

  return {
    token,
    tokenHash: hashApiToken(token),
    prefix
  };
}
