import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking, Slot } from "../../../shared/types.ts";

/** Free rescheduling, free-session and missed-lesson requests, and the free lessons they grant. */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

type Person = Awaited<ReturnType<typeof signedUpUser>>;

/** A tutor teaching 08:00–20:00 every day, so there are always open hours. */
async function busyTutor(email: string): Promise<Person> {
  const tutor = await signedUpUser(harness, "tutor", email);
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const rule = await tutor.client.post("/availability", { weekday, start: "08:00", end: "20:00" });
    assert.equal(rule.status, 201);
  }
  return tutor;
}

/** Open hours at least `hoursAhead` away. */
async function openSlots(tutor: Person, hoursAhead: number): Promise<Slot[]> {
  const { body } = await harness.client().get(`/availability/slots?tutorId=${tutor.user.id}&days=10`);
  return (body as Slot[]).filter((slot) => new Date(slot.startsAt).getTime() > Date.now() + hoursAhead * 3600_000);
}

async function paidLesson(student: Person, tutor: Person, slot: Slot): Promise<Booking> {
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: slot.startsAt,
    durationMins: 60,
    language: "sinhala",
    focus: "Greetings",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const paid = await student.client.post(`/bookings/${created.body.id}/pay`);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.status, "confirmed");
  return paid.body as Booking;
}

async function moveBooking(id: string, startsAt: Date) {
  const { db } = await import("../db/database.ts");
  await db().bookings.updateOne({ id }, { startsAt: startsAt.toISOString() });
}

test("rescheduling: free, to an open hour, with 24 hours' notice for students", async () => {
  const tutor = await busyTutor("move-tutor@example.com");
  const student = await signedUpUser(harness, "student", "move-student@example.com");
  const stranger = await signedUpUser(harness, "student", "move-stranger@example.com");
  const [first, second, third] = await openSlots(tutor, 30);
  const booking = await paidLesson(student, tutor, first);

  assert.equal((await stranger.client.post(`/bookings/${booking.id}/reschedule`, { startsAt: second.startsAt })).status, 403);

  // Not one of the tutor's hours (03:30 is outside 08:00–20:00).
  const odd = new Date(second.startsAt);
  odd.setHours(3, 30, 0, 0);
  assert.equal((await student.client.post(`/bookings/${booking.id}/reschedule`, { startsAt: odd.toISOString() })).status, 400);

  const moved = await student.client.post(`/bookings/${booking.id}/reschedule`, { startsAt: second.startsAt });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal(moved.body.startsAt, second.startsAt);
  assert.equal(moved.body.priceLkr, booking.priceLkr);
  assert.equal(moved.body.status, "confirmed");
  assert.equal(moved.body.reschedules.length, 1);
  assert.equal(moved.body.reschedules[0].from, booking.startsAt);
  assert.match((await latestMail(harness, "move-tutor@example.com", "notification"))?.subject ?? "", /Lesson moved/);

  // Inside 24 hours the student is pointed at a help request; the tutor can still move it.
  await moveBooking(booking.id, new Date(Date.now() + 5 * 3600_000));
  const late = await student.client.post(`/bookings/${booking.id}/reschedule`, { startsAt: third.startsAt });
  assert.equal(late.status, 409);
  assert.equal(late.body.code, "too_late");
  const byTutor = await tutor.client.post(`/bookings/${booking.id}/reschedule`, { startsAt: third.startsAt });
  assert.equal(byTutor.status, 200);
  assert.equal(byTutor.body.reschedules.length, 2);
});

test("free session requests: students ask, only administrators decide, approval grants a free lesson", async () => {
  const tutor = await busyTutor("credit-tutor@example.com");
  const student = await signedUpUser(harness, "student", "credit-student@example.com");
  const admin = await adminClient(harness);

  assert.equal((await student.client.post("/requests", { kind: "free_session", reason: "pls" })).status, 400);
  assert.equal(
    (await tutor.client.post("/requests", { kind: "free_session", reason: "A tutor asking for one" })).status,
    403,
  );
  const asked = await student.client.post("/requests", {
    kind: "free_session",
    reason: "I am new and would like to try a lesson before paying.",
  });
  assert.equal(asked.status, 201);
  assert.equal(asked.body.status, "pending");
  assert.equal(
    (await student.client.post("/requests", { kind: "free_session", reason: "Asking a second time over" })).status,
    409,
  );
  assert.match((await latestMail(harness, "admin@serendiblearn.com", "notification"))?.subject ?? "", /Free session request/);

  // Neither the tutor nor the student can approve it.
  assert.equal((await tutor.client.post(`/requests/${asked.body.id}/approve`)).status, 403);
  assert.equal((await student.client.post(`/requests/${asked.body.id}/approve`)).status, 403);

  const approved = await admin.client.post(`/requests/${asked.body.id}/approve`, { note: "Welcome aboard!" });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, "approved");
  assert.ok(approved.body.creditId);
  assert.equal((await admin.client.post(`/requests/${asked.body.id}/decline`, { note: "Too late" })).status, 409);
  assert.match((await latestMail(harness, "credit-student@example.com", "notification"))?.body ?? "", /Welcome aboard!/);

  const balance = await student.client.get("/requests/credits");
  assert.equal(balance.body.available, 1);

  // Booking with it confirms without paying, and uses it up.
  const [slot] = await openSlots(tutor, 30);
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: slot.startsAt,
    durationMins: 60,
    language: "sinhala",
    focus: "Trial lesson",
  });
  const free = await student.client.post(`/bookings/${created.body.id}/use-credit`);
  assert.equal(free.status, 200);
  assert.equal(free.body.status, "confirmed");
  assert.equal(free.body.creditId, approved.body.creditId);
  assert.match((await latestMail(harness, "credit-student@example.com", "receipt"))?.subject ?? "", /free lesson/);
  assert.equal((await student.client.get("/requests/credits")).body.available, 0);

  // Cancelling a free lesson gives it back.
  assert.equal((await student.client.post(`/bookings/${created.body.id}/cancel`)).status, 200);
  assert.equal((await student.client.get("/requests/credits")).body.available, 1);

  // With none left, use-credit says so.
  const other = await signedUpUser(harness, "student", "no-credit@example.com");
  const unpaid = await other.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: (await openSlots(tutor, 30))[1].startsAt,
    durationMins: 60,
    language: "sinhala",
    focus: "Anything",
  });
  const refused = await other.client.post(`/bookings/${unpaid.body.id}/use-credit`);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, "no_credit");
});

test("missed lessons: reported after the fact, declined with a note or approved as a make-up", async () => {
  const tutor = await busyTutor("missed-tutor@example.com");
  const student = await signedUpUser(harness, "student", "missed-student@example.com");
  const admin = await adminClient(harness);
  const [slotA] = await openSlots(tutor, 30);
  const upcoming = await paidLesson(student, tutor, slotA);
  const report = (bookingId: string) =>
    student.client.post("/requests", {
      kind: "missed_session",
      bookingId,
      cause: "tutor_absent",
      reason: "I waited twenty minutes on the Meet link and nobody came.",
    });

  assert.equal((await report(upcoming.id)).status, 400);

  await moveBooking(upcoming.id, new Date(Date.now() - 2 * 3600_000));
  const first = await report(upcoming.id);
  assert.equal(first.status, 201);
  assert.equal((await report(upcoming.id)).status, 409);

  assert.equal((await admin.client.post(`/requests/${first.body.id}/decline`, {})).status, 400);
  const declined = await admin.client.post(`/requests/${first.body.id}/decline`, {
    note: "Your tutor's notes show the lesson went ahead — let's talk.",
  });
  assert.equal(declined.status, 200);
  assert.equal(declined.body.status, "declined");
  assert.match((await latestMail(harness, "missed-student@example.com", "notification"))?.body ?? "", /went ahead/);

  // After a decline they can ask again (with more detail), and an approval is a make-up lesson.
  const second = await report(upcoming.id);
  assert.equal(second.status, 201);
  assert.equal((await admin.client.post(`/requests/${second.body.id}/approve`)).status, 200);
  const credits = await student.client.get("/requests/credits");
  assert.equal(credits.body.available, 1);
  assert.equal(credits.body.credits[0].reason, "missed_session");

  // Requests are private to the student and the team.
  const nosy = await signedUpUser(harness, "student", "missed-nosy@example.com");
  assert.equal((await nosy.client.get(`/requests?studentId=${student.user.id}`)).status, 403);
  assert.equal((await nosy.client.get("/requests")).body.length, 0);
  assert.ok((await admin.client.get("/requests")).body.length >= 2);
});

test("cancelling a paid lesson: by the tutor it becomes a free lesson, by the student it does not", async () => {
  const tutor = await busyTutor("cancel-tutor@example.com");
  const student = await signedUpUser(harness, "student", "cancel-student@example.com");
  const [slotA, slotB] = await openSlots(tutor, 30);

  const byStudent = await paidLesson(student, tutor, slotA);
  assert.equal((await student.client.post(`/bookings/${byStudent.id}/cancel`)).status, 200);
  assert.equal((await student.client.get("/requests/credits")).body.available, 0);

  const byTutor = await paidLesson(student, tutor, slotB);
  assert.equal((await tutor.client.post(`/bookings/${byTutor.id}/cancel`)).status, 200);
  const credits = await student.client.get("/requests/credits");
  assert.equal(credits.body.available, 1);
  assert.equal(credits.body.credits[0].reason, "tutor_cancelled");
});
