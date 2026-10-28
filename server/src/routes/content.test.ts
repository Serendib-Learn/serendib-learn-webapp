import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { AlphabetSheet, CourseChapter, Holiday, PhraseList } from "../../../shared/types.ts";

/** Teaching content comes from the database through /api/content, and only the right people change it. */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

test("a fresh database is filled with the teaching content, readable by anyone", async () => {
  const anyone = harness.client();
  const lists = (await anyone.get("/content/phrase-lists")).body as PhraseList[];
  assert.equal(lists.length, 8);
  assert.equal(lists[0].id, "arriving");
  assert.equal(lists[0].stage, "Survival Sri Lanka");
  assert.ok(lists[0].phrases.length > 5);

  const sheets = (await anyone.get("/content/alphabet")).body as AlphabetSheet[];
  assert.deepEqual(sheets.map((sheet) => sheet.id), ["sinhala", "tamil"]);
  assert.equal(sheets[0].status, "draft");

  const holidays = (await anyone.get("/content/holidays")).body as Holiday[];
  assert.ok(holidays.length > 20);
  assert.ok(holidays.every((holiday, i) => i === 0 || holidays[i - 1].date <= holiday.date));

  assert.equal((await anyone.get("/content/stages")).body.length, 4);
  assert.ok((await anyone.get("/content/heritage")).body.length > 10);
  assert.equal((await anyone.get("/content/phrase-lists/tuk-tuk-adventure")).body.title, "Tuk tuk adventure");
  assert.equal((await anyone.get("/content/phrase-lists/no-such-list")).status, 404);
  assert.equal((await anyone.get("/content/recipes")).status, 404);
});

test("approved tutors and admins edit phrase lists and the alphabet; students and applicants cannot", async () => {
  const tutor = await signedUpUser(harness, "tutor", "content-tutor@example.com");
  const applicant = await signedUpUser(harness, "tutor", "content-applicant@example.com", { approve: false });
  const student = await signedUpUser(harness, "student", "content-student@example.com");
  const list = (await harness.client().get("/content/phrase-lists/at-the-shop")).body as PhraseList;

  const edited = {
    number: list.number,
    emoji: list.emoji,
    title: list.title,
    scene: "Water, snacks and a SIM — and the change.",
    stage: list.stage,
    phrases: [{ english: "How much is this?", sinhala: "මේක කීයද?", sinhalaRoman: "Meka kiyada?", tamil: "இது எவ்வளவு?", tamilRoman: "Idhu evvalavu?" }, ...list.phrases],
  };

  assert.equal((await harness.client().put("/content/phrase-lists/at-the-shop", edited)).status, 401);
  assert.equal((await student.client.put("/content/phrase-lists/at-the-shop", edited)).status, 403);
  assert.equal((await applicant.client.put("/content/phrase-lists/at-the-shop", edited)).status, 403);

  const saved = await tutor.client.put("/content/phrase-lists/at-the-shop", edited);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.scene, "Water, snacks and a SIM — and the change.");
  assert.equal(saved.body.phrases[0].n, 1);
  assert.equal(saved.body.phrases[1].n, 2);
  assert.equal(saved.body.phrases.length, list.phrases.length + 1);
  assert.equal(saved.body.updatedById, tutor.user.id);
  // The public read sees the change straight away.
  assert.equal((await harness.client().get("/content/phrase-lists/at-the-shop")).body.phrases[0].english, "How much is this?");

  assert.equal(
    (await tutor.client.put("/content/phrase-lists/at-the-shop", { ...edited, phrases: [{ english: "" }] })).status,
    400,
  );

  // A tutor marks the Tamil sheet reviewed.
  const tamil = (await harness.client().get("/content/alphabet/tamil")).body as AlphabetSheet;
  const sheet = { name: tamil.name, native: tamil.native, intro: tamil.intro, groups: tamil.groups, vowelSigns: tamil.vowelSigns, voiceLangs: tamil.voiceLangs };
  const reviewed = await tutor.client.put("/content/alphabet/tamil", { ...sheet, status: "reviewed" });
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
  assert.equal(reviewed.body.status, "reviewed");
  assert.equal((await tutor.client.put("/content/alphabet/klingon", { ...sheet, status: "reviewed" })).status, 400);

  // New lists and removals are for administrators.
  assert.equal((await tutor.client.put("/content/phrase-lists/at-the-bank", { ...edited, title: "At the bank" })).status, 403);
  assert.equal((await tutor.client.delete("/content/phrase-lists/at-the-shop")).status, 403);
});

test("administrators add, change and remove content; holidays and stages are theirs alone", async () => {
  const admin = await adminClient(harness);
  const tutor = await signedUpUser(harness, "tutor", "holiday-tutor@example.com");
  const holiday = { date: "2027-01-03", name: "Duruthu Full Moon Poya Day", category: "poya", funFact: "The first poya of the year." };

  assert.equal((await tutor.client.put("/content/holidays/hol_2027-01-03_duruthu", holiday)).status, 403);
  assert.equal((await admin.client.put("/content/holidays/hol_2027-01-03_duruthu", { ...holiday, date: "3 Jan" })).status, 400);
  const added = await admin.client.put("/content/holidays/hol_2027-01-03_duruthu", holiday);
  assert.equal(added.status, 201);
  assert.ok(((await harness.client().get("/content/holidays")).body as Holiday[]).some((item) => item.date === "2027-01-03"));

  const stage = await admin.client.put("/content/stages/survival-sri-lanka", {
    name: "Survival Sri Lanka",
    description: "Everything you need for your first week on the island.",
  });
  assert.equal(stage.status, 200);
  assert.equal((await tutor.client.put("/content/stages/survival-sri-lanka", { name: "x", description: "y" })).status, 403);

  // A new phrase list, linked from a chapter, then removed: the chapter forgets it.
  const created = await admin.client.put("/content/phrase-lists/at-the-bank", {
    number: 9,
    emoji: "🏦",
    title: "At the bank",
    scene: "Changing money.",
    stage: "Survival Sri Lanka",
    phrases: [{ english: "I would like to change money", sinhala: "", sinhalaRoman: "", tamil: "", tamilRoman: "" }],
  });
  assert.equal(created.status, 201);
  assert.equal((await admin.client.put("/content/phrase-lists/Not A Slug", created.body)).status, 400);
  const chapter = await admin.client.post("/chapters", { stage: "Survival Sri Lanka", title: "At the bank", summary: "", order: 190, vocabChapterId: "at-the-bank" });
  assert.equal(chapter.status, 201);

  assert.equal((await admin.client.delete("/content/phrase-lists/at-the-bank")).status, 204);
  assert.equal((await harness.client().get("/content/phrase-lists/at-the-bank")).status, 404);
  const chapters = (await admin.client.get("/chapters")).body as CourseChapter[];
  assert.equal(chapters.find((item) => item.id === chapter.body.id)?.vocabChapterId, undefined);

  assert.equal((await admin.client.delete("/content/alphabet/sinhala")).status, 400);

  const log = (await admin.client.get("/users/audit-log")).body as { action: string; targetLabel: string }[];
  assert.ok(log.some((entry) => entry.action === "content_removed" && entry.targetLabel === "At the bank"));
  assert.ok(log.some((entry) => entry.action === "content_updated"));
});
