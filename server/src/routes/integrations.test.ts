import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";

/** Starting a Google connection (no call to Google is made: only its consent URL is built). */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer({
    GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "test-secret",
  });
});

after(async () => {
  await harness.close();
});

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
