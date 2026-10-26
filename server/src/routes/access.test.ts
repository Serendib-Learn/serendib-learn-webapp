import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";

/** What a tutor can do versus a student, enforced by the API rather than the UI. */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

const inTwoDays = () => new Date(Date.now() + 48 * 3600_000).toISOString();

test("only tutors publish teaching hours", async () => {
  const student = await signedUpUser(harness, "student", "hours-student@example.com");
  const tutor = await signedUpUser(harness, "tutor", "hours-tutor@example.com");
  const block = { weekday: 2, start: "09:00", end: "11:00" };

  assert.equal((await student.client.post("/availability", block)).status, 403);
  assert.equal((await tutor.client.post("/availability", block)).status, 201);
});

test("lessons are booked for students only", async () => {
  const tutor = await signedUpUser(harness, "tutor", "booked-tutor@example.com");
  const otherTutor = await signedUpUser(harness, "tutor", "booking-tutor@example.com");
  const lesson = { tutorId: tutor.user.id, startsAt: inTwoDays(), durationMins: 60, language: "sinhala", focus: "Greetings" };

  const refused = await otherTutor.client.post("/bookings", lesson);
  assert.equal(refused.status, 403);

  // An administrator can book on a student's behalf, but not for a tutor.
  const admin = await adminClient(harness);
  const student = await signedUpUser(harness, "student", "booked-student@example.com");
  assert.equal((await admin.client.post("/bookings", { ...lesson, studentId: student.user.id })).status, 201);
  assert.equal(
    (await admin.client.post("/bookings", { ...lesson, studentId: otherTutor.user.id, startsAt: new Date(Date.now() + 72 * 3600_000).toISOString() })).status,
    403,
  );
});

test("tutors set homework and assign material only for their own students", async () => {
  const tutor = await signedUpUser(harness, "tutor", "own-tutor@example.com");
  const mine = await signedUpUser(harness, "student", "own-student@example.com");
  const stranger = await signedUpUser(harness, "student", "stranger@example.com");

  // A booking is what makes someone your student.
  const booked = await mine.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: inTwoDays(),
    durationMins: 60,
    language: "sinhala",
    focus: "Numbers",
  });
  assert.equal(booked.status, 201);

  const task = (studentId: string) => ({ studentId, title: "Practise numbers", brief: "1 to 10", dueAt: inTwoDays() });
  assert.equal((await tutor.client.post("/homework", task(stranger.user.id))).status, 403);
  assert.equal((await tutor.client.post("/homework", task(mine.user.id))).status, 201);
  assert.equal((await mine.client.post("/homework", task(mine.user.id))).status, 403);

  const material = { title: "Numbers sheet", kind: "pdf", language: "sinhala", level: "beginner" };
  assert.equal((await tutor.client.post("/materials", { ...material, assignedTo: [stranger.user.id] })).status, 403);
  const created = await tutor.client.post("/materials", { ...material, assignedTo: [mine.user.id] });
  assert.equal(created.status, 201);
  assert.equal(
    (await tutor.client.post(`/materials/${created.body.id}/assign`, { studentIds: [mine.user.id, stranger.user.id] })).status,
    403,
  );
  // Assigning to another tutor is refused even for an administrator.
  const admin = await adminClient(harness);
  assert.equal(
    (await admin.client.post(`/materials/${created.body.id}/assign`, { studentIds: [tutor.user.id] })).status,
    400,
  );
  assert.equal(
    (await admin.client.post(`/materials/${created.body.id}/assign`, { studentIds: [mine.user.id, stranger.user.id] })).status,
    200,
  );
});

test("account records: your own, your students' (tutors), or any (admins)", async () => {
  const tutor = await signedUpUser(harness, "tutor", "records-tutor@example.com");
  const student = await signedUpUser(harness, "student", "records-student@example.com");
  const nosy = await signedUpUser(harness, "student", "nosy@example.com");

  assert.equal((await nosy.client.get(`/users/${student.user.id}`)).status, 403);
  assert.equal((await nosy.client.get(`/users/${tutor.user.id}`)).status, 403);
  assert.equal((await tutor.client.get(`/users/${student.user.id}`)).status, 403);
  assert.equal((await student.client.get(`/users/${student.user.id}`)).status, 200);

  await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: inTwoDays(),
    durationMins: 60,
    language: "sinhala",
    focus: "Anything",
  });
  const asTutor = await tutor.client.get(`/users/${student.user.id}`);
  assert.equal(asTutor.status, 200);
  assert.equal(asTutor.body.email, "records-student@example.com");

  // A student's own tutors come back as public profiles — no email address.
  const tutors = await student.client.get(`/users/${student.user.id}/tutors`);
  assert.equal(tutors.status, 200);
  assert.equal(tutors.body.length, 1);
  assert.equal(tutors.body[0].email, undefined);

  const admin = await adminClient(harness);
  assert.equal((await admin.client.get(`/users/${nosy.user.id}`)).status, 200);
});

test("rates, years teaching and specialties are tutor-only profile fields", async () => {
  const student = await signedUpUser(harness, "student", "rate-student@example.com");
  const tutor = await signedUpUser(harness, "tutor", "rate-tutor@example.com");

  assert.equal((await student.client.patch(`/users/${student.user.id}`, { hourlyRateUsd: 40 })).status, 400);
  assert.equal((await student.client.patch(`/users/${student.user.id}`, { specialties: ["Kids"] })).status, 400);
  assert.equal((await student.client.patch(`/users/${student.user.id}`, { homeTown: "Leeds" })).status, 200);
  assert.equal((await tutor.client.patch(`/users/${tutor.user.id}`, { hourlyRateUsd: 40, specialties: ["Kids"] })).status, 200);
});
