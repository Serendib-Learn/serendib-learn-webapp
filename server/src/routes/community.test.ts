import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { CommunityPost } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

async function member(email: string) {
  const account = await signedUpUser(harness, "student", email);
  const admin = await adminClient(harness);
  await admin.client.post(`/users/${account.user.id}/membership`, { membership: "active" });
  return account;
}

// A 1×1 PNG.
const PIXEL = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test("posts: kinds, an optional title, and a photo only the author can attach", async () => {
  const author = await member("photographer@example.com");
  const other = await member("someone-else@example.com");

  const uploaded = await author.client.post("/post-images", { mimeType: "image/png", data: PIXEL });
  assert.equal(uploaded.status, 201);

  const notAnImage = await author.client.post("/post-images", { mimeType: "text/html", data: PIXEL });
  assert.equal(notAnImage.status, 400);

  const borrowed = await other.client.post("/posts", {
    body: "Look at this",
    kind: "photo",
    imageId: uploaded.body.id,
  });
  assert.equal(borrowed.status, 400, "cannot attach someone else's photo");

  const posted = await author.client.post("/posts", {
    title: "",
    body: "Galle Fort at dusk.",
    kind: "photo",
    imageId: uploaded.body.id,
  });
  assert.equal(posted.status, 201);
  assert.equal((posted.body as CommunityPost).kind, "photo");

  const defaulted = await author.client.post("/posts", { body: "Learnt my first ten words.", kind: "nonsense" });
  assert.equal((defaulted.body as CommunityPost).kind, "story");

  const image = await fetch(`${harness.baseUrl}/post-images/${uploaded.body.id}`);
  assert.equal(image.status, 401, "photos are for signed-in members");
});

test("posts: non-members cannot upload photos", async () => {
  const newcomer = await signedUpUser(harness, "student", "not-yet-member@example.com");
  const refused = await newcomer.client.post("/post-images", { mimeType: "image/png", data: PIXEL });
  assert.equal(refused.status, 403);
});
