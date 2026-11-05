import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";

/**
 * Starting and ending a Google connection. Nothing reaches Google: starting
 * one only builds its consent URL, and the revoke call is intercepted below.
 */

const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

let harness: Awaited<ReturnType<typeof startTestServer>>;
const realFetch = globalThis.fetch;
/** The tokens the API asked Google to revoke, in order. */
let revoked: string[] = [];
let revokeStatus = 200;

before(async () => {
  globalThis.fetch = async (input, init) => {
    if (String(input) !== REVOKE_URL) return realFetch(input, init);
    revoked.push(new URLSearchParams(String(init?.body)).get("token") ?? "");
    return new Response(null, { status: revokeStatus });
  };
  harness = await startTestServer({
    GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "test-secret",
  });
});

beforeEach(() => {
  revoked = [];
  revokeStatus = 200;
});

after(async () => {
  await harness.close();
  globalThis.fetch = realFetch;
});

async function linkCalendar(id: string, email: string, refreshToken: string) {
  const { db } = await import("../db/database.ts");
  await db().googleAccounts.insertOne({ id, email, refreshToken, connectedAt: new Date().toISOString() });
}

async function linkMailer(email: string, refreshToken: string) {
  const { db } = await import("../db/database.ts");
  await db().googleMailer.insertOne({ id: "system", email, refreshToken, connectedAt: new Date().toISOString() });
}

test("connect hands over Google's consent URL as JSON for the portal, and still redirects a plain visit", async () => {
  const tutor = await signedUpUser(harness, "tutor", "connect-tutor@example.com");

  const json = await tutor.client.get("/integrations/google/connect?format=json");
  assert.equal(json.status, 200);
  const consent = new URL(json.body.url);
  assert.equal(consent.hostname, "accounts.google.com");
  assert.ok(consent.searchParams.get("state"), "carries the one-time state the callback checks");
  assert.match(consent.searchParams.get("scope") ?? "", /calendar/);

  // The one-time state is what identifies the tutor on the way back, not a cookie.
  const { db } = await import("../db/database.ts");
  const pending = await db().oauthStates.findById(consent.searchParams.get("state")!);
  assert.equal(pending?.userId, tutor.user.id);
  assert.equal(pending?.purpose, "calendar");

  const plain = await fetch(`${harness.baseUrl}/integrations/google/connect`, { redirect: "manual" });
  assert.equal(plain.status, 401);

  assert.equal((await harness.client().get("/integrations/google/connect?format=json")).status, 401);
});

test("the admin-only connections do the same, and stay admin-only", async () => {
  const admin = await adminClient(harness);
  const tutor = await signedUpUser(harness, "tutor", "not-admin@example.com");

  for (const path of ["/integrations/google/mail/connect", "/integrations/google/system-calendar/connect"]) {
    const json = await admin.client.get(`${path}?format=json`);
    assert.equal(json.status, 200, path);
    assert.equal(new URL(json.body.url).hostname, "accounts.google.com");
    assert.equal((await tutor.client.get(`${path}?format=json`)).status, 403, path);
  }
});

test("each consent screen asks only for the narrow scope that connection uses", async () => {
  const admin = await adminClient(harness);
  const scopesOf = async (path: string) => {
    const { body } = await admin.client.get(`${path}?format=json`);
    return new URL(body.url).searchParams.get("scope")?.split(" ").sort();
  };
  const email = "https://www.googleapis.com/auth/userinfo.email";
  const calendar = ["https://www.googleapis.com/auth/calendar.events.owned", email];

  assert.deepEqual(await scopesOf("/integrations/google/connect"), calendar);
  assert.deepEqual(await scopesOf("/integrations/google/system-calendar/connect"), calendar);
  assert.deepEqual(await scopesOf("/integrations/google/mail/connect"), [
    "https://www.googleapis.com/auth/gmail.send",
    email,
  ]);
});

test("disconnecting forgets the token and withdraws the access at Google", async () => {
  const { db } = await import("../db/database.ts");
  const tutor = await signedUpUser(harness, "tutor", "disconnect-tutor@example.com");
  await linkCalendar(tutor.user.id, "tutor@gmail.example", "tutor-token");

  const response = await tutor.client.post("/integrations/google/disconnect");

  assert.equal(response.status, 204);
  assert.equal(await db().googleAccounts.findById(tutor.user.id), null);
  assert.deepEqual(revoked, ["tutor-token"]);
});

test("disconnecting still works when Google refuses or cannot be reached", async () => {
  const { db } = await import("../db/database.ts");
  const tutor = await signedUpUser(harness, "tutor", "revoke-fails@example.com");
  await linkCalendar(tutor.user.id, "revoke-fails@gmail.example", "stale-token");
  revokeStatus = 400;

  const response = await tutor.client.post("/integrations/google/disconnect");

  assert.equal(response.status, 204);
  assert.equal(await db().googleAccounts.findById(tutor.user.id), null);
});

test("disconnecting with nothing connected asks nothing of Google", async () => {
  const tutor = await signedUpUser(harness, "tutor", "never-connected@example.com");

  assert.equal((await tutor.client.post("/integrations/google/disconnect")).status, 204);
  assert.deepEqual(revoked, []);
});

test("one of two connections on the same Google account is not revoked, since that would end both", async () => {
  const { db, SYSTEM_CALENDAR_ID } = await import("../db/database.ts");
  const admin = await adminClient(harness);
  await linkCalendar(SYSTEM_CALENDAR_ID, "team@gmail.example", "calendar-token");
  await linkMailer("team@gmail.example", "mail-token");

  // Google revokes a whole grant at once: this must not stop the site's email.
  await admin.client.post("/integrations/google/system-calendar/disconnect");
  assert.equal(await db().googleAccounts.findById(SYSTEM_CALENDAR_ID), null);
  assert.equal((await db().googleMailer.findById("system"))?.refreshToken, "mail-token");
  assert.deepEqual(revoked, []);

  // The last connection on that account does revoke.
  await admin.client.post("/integrations/google/mail/disconnect");
  assert.equal(await db().googleMailer.findById("system"), null);
  assert.deepEqual(revoked, ["mail-token"]);
});

test("deleting an account removes its Google token and any half-finished connection", async () => {
  const { db } = await import("../db/database.ts");
  const admin = await adminClient(harness);
  const tutor = await signedUpUser(harness, "tutor", "deleted-tutor@example.com");
  await linkCalendar(tutor.user.id, "deleted-tutor@gmail.example", "deleted-token");
  const { body } = await tutor.client.get("/integrations/google/connect?format=json");
  const state = new URL(body.url).searchParams.get("state")!;

  assert.equal((await admin.client.delete(`/users/${tutor.user.id}`)).status, 204);

  assert.equal(await db().googleAccounts.findById(tutor.user.id), null);
  assert.equal(await db().oauthStates.findById(state), null);
  assert.deepEqual(revoked, ["deleted-token"]);
});
