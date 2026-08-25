import { randomBytes } from "node:crypto";

/** Short, readable, prefixed ids: `bk_9f3a2c1`. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(5).toString("hex")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
