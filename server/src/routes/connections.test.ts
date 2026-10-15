import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { CommunityMember, Connection, ThreadSummary } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

/** A student who has booked and paid, i.e. a vetted member. */
async function member(email: string, languages = ["sinhala"]) {
  const account = await signedUpUser(harness, "student", email, { extra: { languages } });
  const admin = await adminClient(harness);
  await admin.client.post(`/users/${account.user.id}/membership`, { membership: "active" });
  return account;
}

test("directory: only vetted learners, never yourself, and only to vetted viewers", async () => {
  const newcomer = await signedUpUser(harness, "student", "newcomer@example.com");
  const blocked = await newcomer.client.get("/community/members");
  assert.equal(blocked.status, 403, "unvetted members cannot browse");

  const asha = await member("asha@example.com", ["tamil"]);
  const ben = await member("ben@example.com", ["sinhala"]);

  const listed = (await asha.client.get("/community/members")).body as CommunityMember[];
  const ids = listed.map((item) => item.id);
  assert.ok(ids.includes(ben.user.id));
  assert.ok(!ids.includes(asha.user.id), "not yourself");
  assert.ok(!ids.includes(newcomer.user.id), "not the unvetted");
  assert.ok(listed.every((item) => !("email" in item)), "no email addresses");

  const tamilOnly = (await ben.client.get("/community/members?language=tamil")).body as CommunityMember[];
  assert.ok(tamilOnly.some((item) => item.id === asha.user.id));
  assert.ok(!tamilOnly.some((item) => item.id === ben.user.id));

  await ben.client.patch(`/users/${ben.user.id}`, { openToPractice: false });
  const hidden = (await asha.client.get("/community/members")).body as CommunityMember[];
  assert.ok(!hidden.some((item) => item.id === ben.user.id), "opting out hides you");
});

test("friends: request, accept, then message — and not before", async () => {
  const chandi = await member("chandi@example.com");
  const dev = await member("dev@example.com");

  const tooEarly = await chandi.client.post("/threads", { userId: dev.user.id });
  assert.equal(tooEarly.status, 403, "students need to be friends to message");

  const asked = await chandi.client.post("/community/connections", { userId: dev.user.id });
  assert.equal(asked.status, 201);
  const requestId = (asked.body as Connection).id;

  const notice = await latestMail(harness, "dev@example.com", "notification");
  assert.match(notice?.subject ?? "", /would like to practise with you/);

  const wrongPerson = await chandi.client.post(`/community/connections/${requestId}/accept`);
  assert.equal(wrongPerson.status, 403, "you cannot accept your own request");

  const seen = (await dev.client.get("/community/members")).body as CommunityMember[];
  assert.equal(seen.find((item) => item.id === chandi.user.id)?.connection?.direction, "incoming");

  const accepted = await dev.client.post(`/community/connections/${requestId}/accept`);
  assert.equal(accepted.body.status, "accepted");

  const thread = await chandi.client.post("/threads", { userId: dev.user.id });
  assert.ok(thread.status === 200 || thread.status === 201);
  const sent = await chandi.client.post(`/threads/${thread.body.id}/messages`, { body: "Ayubowan!" });
  assert.equal(sent.status, 201);

  const summaries = (await dev.client.get("/threads")).body as ThreadSummary[];
  const summary = summaries.find((item) => item.other.id === chandi.user.id);
  assert.ok(summary);
  assert.equal((summary.other as unknown as Record<string, unknown>).email, undefined, "threads never carry emails");

  // Unfriending keeps the history but stops new messages.
  await dev.client.delete(`/community/connections/${requestId}`);
  const after = await chandi.client.post(`/threads/${thread.body.id}/messages`, { body: "Still there?" });
  assert.equal(after.status, 403);
});

test("asking someone who already asked you is a yes", async () => {
  const eshan = await member("eshan@example.com");
  const farah = await member("farah@example.com");

  await eshan.client.post("/community/connections", { userId: farah.user.id });
  const back = await farah.client.post("/community/connections", { userId: eshan.user.id });
  assert.equal(back.body.status, "accepted");

  const friends = (await eshan.client.get("/community/connections")).body as CommunityMember[];
  assert.equal(friends.find((item) => item.id === farah.user.id)?.connection?.status, "accepted");
});

test("students still message tutors freely", async () => {
  const tutor = await signedUpUser(harness, "tutor", "open-door@example.com");
  const learner = await signedUpUser(harness, "student", "curious@example.com");
  const thread = await learner.client.post("/threads", { userId: tutor.user.id });
  assert.ok(thread.status === 200 || thread.status === 201);
});
