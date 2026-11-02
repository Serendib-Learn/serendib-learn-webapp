import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { AuditLogEntry, HelpQuestion } from "../../../shared/types.ts";

/** The help widget's "Ask us" questions, and admins replying to them. */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

const ask = (overrides: Record<string, unknown> = {}) => ({
  name: "Nimal Perera",
  email: "Nimal@Example.com",
  question: "How do I change the language of my next lesson?",
  page: "/portal/calendar",
  ...overrides,
});

test("a visitor can ask a question; they get a receipt and the admins are told", async () => {
  const { status, body } = await harness.client().post("/help/questions", ask());
  assert.equal(status, 201);
  const question = body as HelpQuestion;
  assert.equal(question.email, "nimal@example.com");
  assert.equal(question.status, "open");
  assert.equal(question.page, "/portal/calendar");
  assert.equal(question.userId, undefined);
  assert.deepEqual(question.replies, []);

  const receipt = await latestMail(harness, "nimal@example.com", "notification");
  assert.match(receipt?.subject ?? "", /got your question/);

  const admin = await adminClient(harness);
  const toAdmin = await latestMail(harness, admin.user.email, "notification");
  assert.match(toAdmin?.subject ?? "", /Help question from Nimal Perera/);
  assert.match(toAdmin?.body ?? "", /change the language/);
});

test("a signed-in person's question is linked to their account", async () => {
  const student = await signedUpUser(harness, "student", "asker@example.com");
  const { status, body } = await student.client.post(
    "/help/questions",
    ask({ email: "asker@example.com" }),
  );
  assert.equal(status, 201);
  assert.equal((body as HelpQuestion).userId, student.user.id);
});

test("questions are validated", async () => {
  const client = harness.client();
  for (const bad of [
    ask({ name: "" }),
    ask({ email: "not-an-email" }),
    ask({ question: "Help?" }),
    { question: "Nothing else filled in at all here." },
  ]) {
    const { status, body } = await client.post("/help/questions", bad);
    assert.equal(status, 400, JSON.stringify(bad));
    assert.ok(typeof body.error === "string" && !body.error.includes("expected"), body.error);
  }

  // A page that isn't a path on this site is dropped, not stored.
  const { body } = await client.post("/help/questions", ask({ page: "https://evil.example" }));
  assert.equal((body as HelpQuestion).page, undefined);
});

test("only administrators can read, reply to, close or delete questions", async () => {
  const { body } = await harness.client().post("/help/questions", ask());
  const id = (body as HelpQuestion).id;
  const student = await signedUpUser(harness, "student", "nosy@example.com");
  const tutor = await signedUpUser(harness, "tutor", "nosy-tutor@example.com");

  for (const client of [harness.client(), student.client, tutor.client]) {
    assert.notEqual((await client.get("/help/questions")).status, 200);
    assert.notEqual((await client.post(`/help/questions/${id}/reply`, { body: "Hi" })).status, 200);
    assert.notEqual((await client.post(`/help/questions/${id}/close`)).status, 200);
    assert.notEqual((await client.delete(`/help/questions/${id}`)).status, 204);
  }
});

test("an admin's reply is emailed to the asker, marks it answered and is audited", async () => {
  const created = await harness.client().post(
    "/help/questions",
    ask({ email: "reply-to-me@example.com", question: "Can my daughter share my account?" }),
  );
  const id = (created.body as HelpQuestion).id;
  const admin = await adminClient(harness);

  const empty = await admin.client.post(`/help/questions/${id}/reply`, { body: "   " });
  assert.equal(empty.status, 400);

  const { status, body } = await admin.client.post(`/help/questions/${id}/reply`, {
    body: "Each learner needs their own account, so their tutor can follow their progress.",
  });
  assert.equal(status, 200);
  const answered = body as HelpQuestion;
  assert.equal(answered.status, "answered");
  assert.equal(answered.replies.length, 1);
  assert.equal(answered.replies[0].byId, admin.user.id);

  const mail = await latestMail(harness, "reply-to-me@example.com", "notification");
  assert.match(mail?.subject ?? "", /Re: your question/);
  assert.match(mail?.body ?? "", /their own account/);
  assert.match(mail?.body ?? "", /share my account/);

  // A follow-up reply is kept alongside the first.
  const again = await admin.client.post(`/help/questions/${id}/reply`, { body: "One more thing." });
  assert.equal((again.body as HelpQuestion).replies.length, 2);

  const list = await admin.client.get("/help/questions");
  assert.ok((list.body as HelpQuestion[]).some((item) => item.id === id && item.status === "answered"));

  const log = await admin.client.get("/users/audit-log");
  assert.ok((log.body as AuditLogEntry[]).some((entry) => entry.action === "help_replied"));
});

test("an admin can close a question without replying, or delete it", async () => {
  const admin = await adminClient(harness);
  const first = (await harness.client().post("/help/questions", ask())).body as HelpQuestion;
  const second = (await harness.client().post("/help/questions", ask())).body as HelpQuestion;

  const closed = await admin.client.post(`/help/questions/${first.id}/close`);
  assert.equal(closed.status, 200);
  assert.equal((closed.body as HelpQuestion).status, "answered");
  assert.deepEqual((closed.body as HelpQuestion).replies, []);

  assert.equal((await admin.client.delete(`/help/questions/${second.id}`)).status, 204);
  const list = (await admin.client.get("/help/questions")).body as HelpQuestion[];
  assert.ok(!list.some((item) => item.id === second.id));
  assert.equal((await admin.client.delete(`/help/questions/${second.id}`)).status, 404);
});
