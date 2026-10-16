import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

const audio = Buffer.from("a few seconds of someone saying ka").toString("base64");

test("alphabet audio: tutors record, everyone listens, students cannot record", async () => {
  await signedUpUser(harness, "tutor", "voice-tutor@example.com");

  const put = await fetch(`${harness.baseUrl}/alphabet-audio/sinhala/0D9A`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: await cookie("voice-tutor@example.com") },
    body: JSON.stringify({ mimeType: "audio/webm;codecs=opus", data: audio }),
  });
  assert.equal(put.status, 204);

  const listed = await harness.client().get("/alphabet-audio");
  assert.deepEqual(
    (listed.body as { language: string; key: string }[]).map((item) => `${item.language}:${item.key}`),
    ["sinhala:0D9A"],
  );

  const heard = await fetch(`${harness.baseUrl}/alphabet-audio/sinhala/0D9A`);
  assert.equal(heard.status, 200, "no login needed to listen");
  assert.equal(heard.headers.get("cross-origin-resource-policy"), "cross-origin");
  assert.equal(Buffer.from(await heard.arrayBuffer()).toString("base64"), audio);

  await signedUpUser(harness, "student", "voice-student@example.com");
  const refused = await fetch(`${harness.baseUrl}/alphabet-audio/sinhala/0D9A`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: await cookie("voice-student@example.com") },
    body: JSON.stringify({ mimeType: "audio/webm", data: audio }),
  });
  assert.equal(refused.status, 403);

  const badKey = await fetch(`${harness.baseUrl}/alphabet-audio/sinhala/not-a-letter`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: await cookie("voice-tutor@example.com") },
    body: JSON.stringify({ mimeType: "audio/webm", data: audio }),
  });
  assert.equal(badKey.status, 400);

  const admin = await adminClient(harness);
  const removed = await admin.client.delete("/alphabet-audio/sinhala/0D9A");
  assert.equal(removed.status, 204);
  const gone = await fetch(`${harness.baseUrl}/alphabet-audio/sinhala/0D9A`);
  assert.equal(gone.status, 404);
});

/** A fresh session cookie for a signed-up test account (password from the helpers). */
async function cookie(email: string): Promise<string> {
  const login = await fetch(`${harness.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  return (login.headers.get("set-cookie") ?? "").split(";")[0];
}
