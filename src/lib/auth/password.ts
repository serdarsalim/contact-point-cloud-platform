import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const currentHash = scryptSync(password, salt, PASSWORD_KEYLEN).toString("hex");

  return timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(currentHash, "hex"));
}

export function generatePassword(length = 20): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let result = "";

  while (result.length < length) {
    const byte = randomBytes(1)[0] ?? 0;
    result += chars[byte % chars.length];
  }

  return result;
}
