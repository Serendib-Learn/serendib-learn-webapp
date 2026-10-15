import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import { defaultChapters } from "../../../shared/curriculum.ts";
import type { CourseChapter, Material } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

test("chapters: every site starts with the course outline, in order", async () => {
  const student = await signedUpUser(harness, "student", "outline@example.com");
  const { body } = await student.client.get("/chapters");
  const chapters = body as CourseChapter[];
  assert.equal(chapters.length, defaultChapters.length);
  assert.equal(chapters[0].title, "The alphabet and its sounds");
  assert.deepEqual(
    chapters.map((chapter) => chapter.order),
    [...chapters.map((chapter) => chapter.order)].sort((a, b) => a - b),
  );

  const refused = await student.client.post("/chapters", { stage: "X", title: "Y", order: 1 });
  assert.equal(refused.status, 403);
});

test("materials are filed by chapter, and survive their chapter being removed", async () => {
  const admin = await adminClient(harness);
  const tutor = await signedUpUser(harness, "tutor", "filer@example.com");

  const added = await admin.client.post("/chapters", {
    stage: "Building & fluency",
    title: "At the temple",
    summary: "Respectful phrases for a visit.",
    order: 230,
  });
  assert.equal(added.status, 201);
  const chapterId = (added.body as CourseChapter).id;

  const filed = await tutor.client.post("/materials", {
    title: "Temple etiquette",
    kind: "pdf",
    language: "sinhala",
    level: "beginner",
    assignedTo: [],
    chapterId,
  });
  assert.equal(filed.status, 201);
  assert.equal((filed.body as Material).chapterId, chapterId);

  const nowhere = await tutor.client.post("/materials", {
    title: "Lost",
    kind: "pdf",
    chapterId: "ch_does-not-exist",
  });
  assert.equal(nowhere.status, 400);

  const moved = await tutor.client.post(`/materials/${filed.body.id}/chapter`, {
    chapterId: "ch_worksheets",
  });
  assert.equal(moved.body.chapterId, "ch_worksheets");
  await tutor.client.post(`/materials/${filed.body.id}/chapter`, { chapterId });

  const removed = await admin.client.delete(`/chapters/${chapterId}`);
  assert.equal(removed.status, 204);

  const mine = await tutor.client.get(`/materials?ownerId=${tutor.user.id}`);
  const survivor = (mine.body as Material[]).find((item) => item.id === filed.body.id);
  assert.ok(survivor, "the material is still there");
  assert.equal(survivor.chapterId, undefined, "just unfiled");
});
