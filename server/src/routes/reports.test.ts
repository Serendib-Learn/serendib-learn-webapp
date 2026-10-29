import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking, Slot, TutorHoursReport } from "../../../shared/types.ts";

/** The tutor hours report: administrators only, and what counts as a verified hour. */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

const hour = 3600_000;

test("tutor hours: taught, verified, awaiting a write-up, reported missed, upcoming", async () => {
  const { db } = await import("../db/database.ts");
  const tutor = await signedUpUser(harness, "tutor", "hours-tutor@example.com");
  const student = await signedUpUser(harness, "student", "hours-student@example.com");
  for (let weekday = 0; weekday < 7; weekday += 1) {
    await tutor.client.post("/availability", { weekday, start: "08:00", end: "20:00" });
  }
  const { body: slots } = await harness.client().get(`/availability/slots?tutorId=${tutor.user.id}&days=10`);

  const book = async (slot: Slot): Promise<Booking> => {
    const created = await student.client.post("/bookings", {
      tutorId: tutor.user.id,
      startsAt: slot.startsAt,
      durationMins: 60,
      language: "tamil",
      focus: "Numbers",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    return (await student.client.post(`/bookings/${created.body.id}/pay`)).body as Booking;
  };
  const [written, unwritten, missed, coming, abandoned] = await Promise.all(
    (slots as Slot[]).slice(0, 5).map(book),
  );

  // Three lessons in the past: one written up, one not yet, one reported as the tutor not coming.
  const days = (n: number) => new Date(Date.now() - n * 24 * hour).toISOString();
  await db().bookings.updateOne({ id: written.id }, { startsAt: days(3), status: "completed" });
  await db().bookings.updateOne({ id: unwritten.id }, { startsAt: days(2) });
  await db().bookings.updateOne({ id: missed.id }, { startsAt: days(1) });
  // A checkout nobody finished: not a lesson at all.
  await db().bookings.updateOne({ id: abandoned.id }, { status: "cancelled", paidAt: undefined });
  const reported = await student.client.post("/requests", {
    kind: "missed_session",
    bookingId: missed.id,
    cause: "tutor_absent",
    reason: "Waited twenty minutes and nobody joined.",
  });
  assert.equal(reported.status, 201, JSON.stringify(reported.body));

  const from = new Date(Date.now() - 10 * 24 * hour).toISOString();
  const to = new Date(Date.now() + 20 * 24 * hour).toISOString();
  const query = `/reports/tutor-hours?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  // Only administrators see it — not the tutor, not the student.
  assert.equal((await tutor.client.get(query)).status, 403);
  assert.equal((await student.client.get(query)).status, 403);
  assert.equal((await harness.client().get(query)).status, 401);

  const admin = await adminClient(harness);
  assert.equal((await admin.client.get("/reports/tutor-hours?from=nope&to=2026-01-01")).status, 400);
  assert.equal((await admin.client.get(`/reports/tutor-hours?from=${encodeURIComponent(to)}&to=${encodeURIComponent(from)}`)).status, 400);

  const { status, body } = await admin.client.get(query);
  assert.equal(status, 200, JSON.stringify(body));
  const mine = (body as TutorHoursReport).tutors.find((summary) => summary.tutorId === tutor.user.id);
  assert.ok(mine, "every tutor is in the report");
  assert.equal(mine.tutorName, tutor.user.name);
  assert.equal(mine.taughtLessons, 3);
  assert.equal(mine.taughtMinutes, 180);
  assert.equal(mine.verifiedMinutes, 60, "only the written-up, undisputed lesson counts towards pay");
  assert.equal(mine.awaitingWriteUp, 2);
  assert.equal(mine.disputed, 1);
  assert.equal(mine.upcomingLessons, 1);
  assert.equal(mine.cancelledLessons, 0, "an abandoned checkout is left out");
  assert.equal(mine.lessons.length, 4);

  const byId = new Map(mine.lessons.map((lesson) => [lesson.bookingId, lesson]));
  assert.equal(byId.get(written.id)?.verified, true);
  assert.equal(byId.get(unwritten.id)?.verified, false);
  assert.deepEqual(byId.get(missed.id)?.dispute, { status: "pending", cause: "tutor_absent" });
  assert.equal(byId.get(coming.id)?.state, "upcoming");
  // Paid through the demo checkout: recorded, not a card payment.
  assert.equal(byId.get(written.id)?.paidWith, "recorded");
  assert.equal(mine.cardCents, 0);
});
