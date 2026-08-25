import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Stored as `scrypt$<salt>$<hash>`. scrypt ships with Node, so there is no
 * native dependency to build, and it is a real key derivation function rather
 * than a plain digest.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = await derive(password, salt, expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sixDigitCode(): string {
  // Rejection-free and unbiased enough for a demo confirmation code.
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}
