import { config } from "../config.ts";
import { db } from "../db/database.ts";
import type { ResetToken } from "../db/database.ts";
import { newId, nowIso } from "./ids.ts";
import { deliver } from "./mail.ts";
import { hashPassword, randomToken } from "./passwords.ts";
import type { User } from "../../../shared/types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a forgotten-password link works. */
export const RESET_LINK_MS = DAY_MS;
/** How long an invitation to set a first password works. */
export const INVITE_LINK_MS = 7 * DAY_MS;

export function tokenExpired(record: ResetToken): boolean {
  const expiresAt = record.expiresAt
    ? new Date(record.expiresAt).getTime()
    : new Date(record.createdAt).getTime() + RESET_LINK_MS;
  return expiresAt < Date.now();
}

/** A single-use link to the reset screen, absolute so it works from a real inbox. */
export async function passwordLink(email: string, validForMs: number) {
  const token = randomToken(24);
  const createdAt = nowIso();
  await db().resetTokens.insertOne({
    id: token,
    email,
    createdAt,
    expiresAt: new Date(Date.now() + validForMs).toISOString(),
  });
  return { token, url: `${config.appUrl}/portal/reset-password?token=${token}` };
}

/** Emails everyone with the admin role. Used for things that need a human decision. */
export async function notifyAdmins(subject: string, body: string): Promise<void> {
  const admins = await db().users.find({ role: "admin" });
  for (const admin of admins) {
    await deliver({ to: admin.email, subject, body, kind: "notification" });
  }
}

/**
 * Sends someone whose account an administrator created a link to choose a
 * password. The account is already verified — the admin vouched for the
 * address, and following the link proves it anyway.
 */
export async function sendInvite(user: User, invitedBy: string): Promise<void> {
  const link = await passwordLink(user.email, INVITE_LINK_MS);
  const what =
    user.role === "tutor"
      ? "a tutor account"
      : user.role === "admin"
        ? "an administrator account"
        : "an account";

  await deliver({
    to: user.email,
    subject: "Your Serendib Learn account is ready",
    body: `${invitedBy} has set up ${what} for you on Serendib Learn.\n\nChoose your password here — the link works once, for seven days:\n\n${link.url}\n\nIf you were not expecting this, you can ignore it.`,
    kind: "password_reset",
    token: link.token,
  });
}

/**
 * Makes sure the owners' account from SUPER_ADMIN_EMAIL exists and is a
 * super admin. Runs on every boot, so it is idempotent: it never touches a
 * password that already exists.
 */
export async function ensureSuperAdmin(): Promise<void> {
  const { email, name, password } = config.superAdmin;
  if (!email) return;

  const existing = await db().users.findOne({ email });

  if (existing) {
    if (existing.role !== "admin" || !existing.superAdmin) {
      await db().users.updateOne({ id: existing.id }, { role: "admin", superAdmin: true, verified: true });
      console.log(`Super admin: promoted ${email}.`);
    }
    return;
  }

  const user: User = {
    id: newId("u"),
    name,
    email,
    role: "admin",
    superAdmin: true,
    verified: true,
    membership: "active",
    createdAt: nowIso(),
    timezone: "Asia/Colombo",
    languages: ["sinhala", "tamil"],
  };
  await db().users.insertOne(user);

  if (password) {
    await db().credentials.insertOne({ id: user.id, hash: await hashPassword(password) });
    console.log(`Super admin: created ${email} with the password from SUPER_ADMIN_PASSWORD.`);
  } else {
    await sendInvite(user, "Serendib Learn");
    console.log(`Super admin: created ${email}; a set-your-password link was sent to that address.`);
  }
}
