const required = ["DATABASE_URL", "AUTH_SESSION_SECRET", "TOKEN_HASH_SALT"] as const;

type RequiredEnvKey = (typeof required)[number];

function readRequired(key: RequiredEnvKey): string {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
}

export const env = {
  databaseUrl: () => readRequired("DATABASE_URL"),
  authSessionSecret: () => readRequired("AUTH_SESSION_SECRET"),
  tokenHashSalt: () => readRequired("TOKEN_HASH_SALT"),
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
};
