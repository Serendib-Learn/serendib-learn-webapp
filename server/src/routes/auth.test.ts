import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startTestServer } from "../test-support/harness.ts";
import type { MailMessage, User } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

/** Demo mode exposes the mail collection unauthenticated — this is how a
 * test "reads its email" the same way the Demo Inbox UI does. */
async function codeSentTo(email: string): Promise<string> {
  const { body } = await harness.client().get("/mail");
  const message = (body as MailMessage[])
    .filter((item) => item.kind === "verification" && item.to === email)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
  assert.ok(message?.code, `expected a verification code sent to ${email}`);
  return message.code;
}

test("signup -> verify -> me: the whole account-creation flow works end to end", async () => {
  const client = harness.client();
  const email = "flow-test@example.com";

  const signUp = await client.post("/auth/signup", {
    name: "Flow Test",
    email,
    password: "password123",
    role: "student",
    languages: ["sinhala"],
  });
  assert.equal(signUp.status, 201);
  assert.equal(signUp.body.email, email);

  const code = await codeSentTo(email);

  const verify = await client.post("/auth/verify", { email, code });
  assert.equal(verify.status, 200);
  assert.equal(verify.body.user.verified, true);

  // The session cookie from /verify should already be enough to identify us.
  const me = await client.get("/auth/me");
  assert.equal((me.body.user as User).email, email);
});

test("signup: rejects a second account on the same email", async () => {
  const client = harness.client();
  const email = "dupe-test@example.com";
  const payload = {
    name: "Dupe",
    email,
    password: "password123",
    role: "student",
    languages: ["sinhala"],
  };

  assert.equal((await client.post("/auth/signup", payload)).status, 201);

  const second = await client.post("/auth/signup", payload);
  assert.equal(second.status, 400);
  assert.match(second.body.error, /already exists/);
});

test("signup: rejects a malformed email with a friendly message, not zod's generic one", async () => {
  const response = await harness.client().post("/auth/signup", {
    name: "Bad Email",
    email: "not-an-email",
    password: "password123",
    languages: ["sinhala"],
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "That does not look like an email address.");
});

test("signup: rejects a password under 8 characters", async () => {
  const response = await harness.client().post("/auth/signup", {
    name: "Short Password",
    email: "short-pw@example.com",
    password: "short",
    languages: ["sinhala"],
  });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /at least 8 characters/);
});

test("login: refuses before the account is verified", async () => {
  const client = harness.client();
  const email = "unverified@example.com";
  await client.post("/auth/signup", {
    name: "Unverified",
    email,
    password: "password123",
    languages: ["sinhala"],
  });

  const login = await client.post("/auth/login", { email, password: "password123" });
  assert.equal(login.status, 403);
  assert.match(login.body.error, /Confirm your email/);
});

test("login: wrong password and unknown email get the identical message", async () => {
  const client = harness.client();
  const email = "wrong-pw@example.com";
  await client.post("/auth/signup", {
    name: "Wrong Password",
    email,
    password: "password123",
    languages: ["sinhala"],
  });
  const code = await codeSentTo(email);
  await client.post("/auth/verify", { email, code });

  const wrongPassword = await client.post("/auth/login", { email, password: "not-it" });
  const unknownEmail = await client.post("/auth/login", {
    email: "nobody-here@example.com",
    password: "whatever1",
  });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.equal(
    wrongPassword.body.error,
    unknownEmail.body.error,
    "must not leak which of the two cases actually happened",
  );
});

test("forgot-password: silent on an email with no account, sends a real reset otherwise", async () => {
  const client = harness.client();

  const silent = await client.post("/auth/forgot-password", { email: "nobody@example.com" });
  assert.equal(silent.status, 204);

  const email = "reset-me@example.com";
  await client.post("/auth/signup", {
    name: "Reset Me",
    email,
    password: "password123",
    languages: ["sinhala"],
  });
  const code = await codeSentTo(email);
  await client.post("/auth/verify", { email, code });

  await client.post("/auth/forgot-password", { email });
  const { body: mail } = await harness.client().get("/mail");
  const resetMail = (mail as MailMessage[])
    .filter((item) => item.kind === "password_reset" && item.to === email)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
  assert.ok(resetMail?.token, "expected a reset token to be mailed");

  const reset = await client.post("/auth/reset-password", {
    token: resetMail.token,
    password: "a-new-password1",
  });
  assert.equal(reset.status, 200);

  const oldPassword = await client.post("/auth/login", { email, password: "password123" });
  assert.equal(oldPassword.status, 401, "the old password must stop working");

  const newPassword = await client.post("/auth/login", { email, password: "a-new-password1" });
  assert.equal(newPassword.status, 200);
});
