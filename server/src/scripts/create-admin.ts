/**
 * Creates (or promotes) a super admin account against whatever database
 * server/.env points at — for setting up the owners' account on a real
 * deployment without going through the demo seed.
 *
 *   npm run create-admin -- --email you@serendiblearn.com --name "Your Name"
 *
 * Asks for a password unless ADMIN_PASSWORD is set in the environment. An
 * existing account with that email keeps its password and is promoted.
 */
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import { connect, db, disconnect } from "../db/database.ts";
import { newId, normaliseEmail, nowIso } from "../lib/ids.ts";
import { hashPassword } from "../lib/passwords.ts";
import type { User } from "../../../shared/types.ts";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
  },
});

const email = normaliseEmail(values.email ?? "");
if (!email.includes("@")) {
  console.error('Usage: npm run create-admin -- --email you@example.com --name "Your Name"');
  process.exit(1);
}

await connect();

const existing = await db().users.findOne({ email });

if (existing) {
  await db().users.updateOne(
    { id: existing.id },
    { role: "admin", superAdmin: true, verified: true },
  );
  console.log(`${email} already had an account — it is now a super admin. Password unchanged.`);
} else {
  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    password = await prompt.question("Password for the new account (at least 8 characters): ");
    prompt.close();
  }
  if (password.length < 8) {
    console.error("That password is under 8 characters. Nothing was created.");
    await disconnect();
    process.exit(1);
  }

  const user: User = {
    id: newId("u"),
    name: values.name?.trim() || "Serendib Team",
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
  await db().credentials.insertOne({ id: user.id, hash: await hashPassword(password) });
  console.log(`Created super admin ${email}. Log in at /portal/login.`);
}

await disconnect();
