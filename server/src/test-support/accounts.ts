import assert from "node:assert/strict";
import type { startTestServer } from "./harness.ts";
import type { MailMessage, User } from "../../../shared/types.ts";

type Harness = Awaited<ReturnType<typeof startTestServer>>;

/** The seeded super admin, logged in. Only exists because tests run in demo mode. */
export async function adminClient(harness: Harness) {
  const client = harness.client();
  const login = await client.post("/auth/login", {
    email: "admin@serendiblearn.com",
    password: "serendib",
  });
  assert.equal(login.status, 200, "seeded admin should be able to log in");
  return { client, user: login.body.user as User };
}

export async function latestMail(
  harness: Harness,
  to: string,
  kind: MailMessage["kind"],
): Promise<MailMessage | undefined> {
  const { body } = await harness.client().get("/mail");
  return (body as MailMessage[])
    .filter((item) => item.kind === kind && item.to === to)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
}

export async function codeSentTo(harness: Harness, email: string): Promise<string> {
  const message = await latestMail(harness, email, "verification");
  assert.ok(message?.code, `expected a verification code sent to ${email}`);
  return message.code;
}

/**
 * A verified, logged-in account of the given role, with its own cookie jar.
 * Tutors are approved by the seeded admin unless `approve` is false, since
 * an unapproved tutor cannot be booked.
 */
export async function signedUpUser(
  harness: Harness,
  role: "student" | "tutor",
  email: string,
  options: { approve?: boolean; extra?: Record<string, unknown> } = {},
) {
  const client = harness.client();
  const signup = await client.post("/auth/signup", {
    name: role === "tutor" ? "Test Tutor" : "Test Student",
    email,
    password: "password123",
    role,
    languages: ["sinhala"],
    ...options.extra,
  });
  assert.equal(signup.status, 201, `signup for ${email} failed: ${JSON.stringify(signup.body)}`);

  const code = await codeSentTo(harness, email);
  const verified = await client.post("/auth/verify", { email, code });
  let user = verified.body.user as User;

  if (role === "tutor" && options.approve !== false) {
    const admin = await adminClient(harness);
    const approved = await admin.client.post(`/users/${user.id}/tutor-status`, {
      status: "approved",
    });
    assert.equal(approved.status, 200);
    user = approved.body as User;
  }

  return { client, user };
}
