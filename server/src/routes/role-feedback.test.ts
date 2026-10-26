import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking, LessonNote, MaterialFeedbackSummary } from "../../../shared/types.ts";

/** Students and tutors answer different questions — after a lesson, and about materials. */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

type Person = Awaited<ReturnType<typeof signedUpUser>>;

/** A paid lesson that finished an hour ago. */
async function finishedLesson(student: Person, tutor: Person, hoursAhead: number): Promise<Booking> {
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: new Date(Date.now() + hoursAhead * 3600_000).toISOString(),
    durationMins: 60,
    language: "tamil",
    focus: "Family words",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  await student.client.post(`/bookings/${created.body.id}/pay`);
  const { db } = await import("../db/database.ts");
  await db().bookings.updateOne(
    { id: created.body.id },
    { startsAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
  );
  return created.body as Booking;
}

test("after a lesson: the student rates pace and materials, the tutor marks progress and shares materials", async () => {
  const tutor = await signedUpUser(harness, "tutor", "fb-tutor@example.com");
  const student = await signedUpUser(harness, "student", "fb-student@example.com");
  const booking = await finishedLesson(student, tutor, 50);

  const feedback = await student.client.post("/feedback", {
    bookingId: booking.id,
    rating: 5,
    comment: "Loved it",
    pace: "too_fast",
    materialsRating: 4,
    nextFocus: "Numbers and money",
  });
  assert.equal(feedback.status, 201);
  assert.equal(feedback.body.pace, "too_fast");
  assert.equal(feedback.body.materialsRating, 4);
  const toTutor = await latestMail(harness, "fb-tutor@example.com", "notification");
  assert.match(toTutor?.body ?? "", /Pace: too fast/);
  assert.match(toTutor?.body ?? "", /Next time: Numbers and money/);
  assert.equal(
    (await student.client.post("/feedback", { bookingId: booking.id, rating: 3, pace: "sideways" })).status,
    400,
  );

  // A material of the tutor's own, assigned to someone else, plus one from the open library.
  const otherStudent = await signedUpUser(harness, "student", "fb-other@example.com");
  await finishedLesson(otherStudent, tutor, 60);
  const own = await tutor.client.post("/materials", {
    title: "Family tree worksheet",
    kind: "pdf",
    language: "tamil",
    level: "beginner",
    assignedTo: [otherStudent.user.id],
  });
  assert.equal(own.status, 201);
  const admin = await adminClient(harness);
  const library = await admin.client.post("/materials", { title: "Tamil vowels chart", kind: "pdf", language: "tamil", level: "beginner" });

  const refused = await tutor.client.post("/feedback/lesson-notes", {
    bookingId: booking.id,
    summary: "Family words",
    materialIds: ["mat_does-not-exist"],
  });
  assert.equal(refused.status, 400);

  const note = await tutor.client.post("/feedback/lesson-notes", {
    bookingId: booking.id,
    summary: "Family words: akka, anna, amma.",
    workOn: "Long vowels",
    progress: "on_track",
    engagement: 4,
    materialIds: [own.body.id, library.body.id],
  });
  assert.equal(note.status, 201, JSON.stringify(note.body));
  assert.equal(note.body.progress, "on_track");
  assert.deepEqual(note.body.materialIds, [own.body.id, library.body.id]);
  assert.match((await latestMail(harness, "fb-student@example.com", "notification"))?.body ?? "", /Where you are: on track/);

  // The worksheet is now in the student's hub too.
  const hub = await student.client.get(`/materials?studentId=${student.user.id}`);
  assert.ok((hub.body as { id: string }[]).some((material) => material.id === own.body.id));

  // The student sees their progress, not the engagement score; the team sees both.
  const mine = (await student.client.get(`/lesson-notes?studentId=${student.user.id}`)).body as LessonNote[];
  assert.equal(mine[0].progress, "on_track");
  assert.equal(mine[0].engagement, undefined);
  const theirs = (await admin.client.get(`/lesson-notes?studentId=${student.user.id}`)).body as LessonNote[];
  assert.equal(theirs[0].engagement, 4);
});

test("material feedback: students on what they can see, tutors on the library, owners read it all", async () => {
  const owner = await signedUpUser(harness, "tutor", "mat-owner@example.com");
  const student = await signedUpUser(harness, "student", "mat-student@example.com");
  const outsider = await signedUpUser(harness, "student", "mat-outsider@example.com");
  const reviewer = await signedUpUser(harness, "tutor", "mat-reviewer@example.com");
  await finishedLesson(student, owner, 80);

  const assigned = await owner.client.post("/materials", {
    title: "Greetings flashcards",
    kind: "deck",
    language: "sinhala",
    level: "beginner",
    assignedTo: [student.user.id],
  });
  const open = await owner.client.post("/materials", { title: "Numbers audio", kind: "audio", language: "sinhala", level: "beginner" });

  // Students: helpfulness and level. A tutor-only field is dropped.
  const studentSays = await student.client.put(`/materials/${assigned.body.id}/feedback`, {
    rating: 4,
    level: "too_hard",
    suggestion: "students cannot set this",
    comment: "Useful but fast",
  });
  assert.equal(studentSays.status, 201);
  assert.equal(studentSays.body.authorRole, "student");
  assert.equal(studentSays.body.level, "too_hard");
  assert.equal(studentSays.body.suggestion, undefined);

  // Changing your mind updates the same entry.
  const changed = await student.client.put(`/materials/${assigned.body.id}/feedback`, { rating: 5, level: "just_right" });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.id, studentSays.body.id);
  assert.equal(changed.body.rating, 5);

  assert.equal((await outsider.client.put(`/materials/${assigned.body.id}/feedback`, { rating: 3 })).status, 403);
  assert.equal((await owner.client.put(`/materials/${open.body.id}/feedback`, { rating: 5 })).status, 400);
  assert.equal((await student.client.put(`/materials/${open.body.id}/feedback`, { rating: 0 })).status, 400);

  // Tutors: how it works in a lesson, and a suggestion. A student-only field is dropped.
  const tutorSays = await reviewer.client.put(`/materials/${open.body.id}/feedback`, {
    rating: 3,
    level: "too_easy",
    suggestion: "Add a slower recording",
    comment: "Good for warm-ups",
  });
  assert.equal(tutorSays.status, 201);
  assert.equal(tutorSays.body.authorRole, "tutor");
  assert.equal(tutorSays.body.suggestion, "Add a slower recording");
  assert.equal(tutorSays.body.level, undefined);

  // The owner reads everything; others only their own.
  assert.equal((await owner.client.get(`/materials/${open.body.id}/feedback`)).body.length, 1);
  assert.equal((await student.client.get(`/materials/${assigned.body.id}/feedback`)).status, 403);
  assert.equal((await student.client.get("/materials/feedback/mine")).body.length, 1);

  const summary = (await owner.client.get("/materials/feedback/summary")).body as MaterialFeedbackSummary[];
  assert.deepEqual(
    summary.map(({ materialId, count, average }) => ({ materialId, count, average })).sort((a, b) => a.materialId.localeCompare(b.materialId)),
    [
      { materialId: assigned.body.id, count: 1, average: 5 },
      { materialId: open.body.id, count: 1, average: 3 },
    ].sort((a, b) => a.materialId.localeCompare(b.materialId)),
  );
});
