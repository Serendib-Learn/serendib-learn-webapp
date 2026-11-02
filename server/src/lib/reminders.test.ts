import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking, MailMessage, Slot } from "../../../shared/types.ts";

/**
 * Reminders race: the in-process timer on every instance, Cloud Scheduler's
 * POST /jobs/reminders and any local server on the same database can all run
 * at once. Each email must still go out exactly once.
 */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

async function mailTo(email: string, subject: RegExp): Promise<MailMessage[]> {
  const { body } = await harness.client().get("/mail");
  return (body as MailMessage[]).filter((mail) => mail.to === email && subject.test(mail.subject));
}

async function lesson(name: string): Promise<Booking> {
  const tutor = await signedUpUser(harness, "tutor", `${name}-tutor@example.com`);
  const student = await signedUpUser(harness, "student", `${name}-student@example.com`);
  for (let weekday = 0; weekday < 7; weekday += 1) {
    await tutor.client.post("/availability", { weekday, start: "08:00", end: "20:00" });
  }
  const { body: slots } = await harness.client().get(`/availability/slots?tutorId=${tutor.user.id}&days=10`);
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: (slots as Slot[])[3].startsAt,
    durationMins: 60,
    language: "tamil",
    focus: "Numbers",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return (await student.client.post(`/bookings/${created.body.id}/pay`)).body as Booking;
}

test("feedback reminders: three runs at once send each email once", async () => {
  const { db } = await import("../db/database.ts");
  const { runReminders } = await import("./reminders.ts");
  const booking = await lesson("race-feedback");
  // The lesson ended ten minutes ago.
  await db().bookings.updateOne({ id: booking.id }, { startsAt: new Date(Date.now() - 70 * 60_000).toISOString() });

  await Promise.all([runReminders(), runReminders(), runReminders()]);
  assert.equal((await mailTo("race-feedback-student@example.com", /How was your lesson/)).length, 1);
  assert.equal((await mailTo("race-feedback-tutor@example.com", /Write up your lesson/)).length, 1);

  // Running again sends nothing more; the second reminder waits for the next day.
  await runReminders();
  assert.equal((await mailTo("race-feedback-student@example.com", /How was your lesson|reminder/i)).length, 1);

  // A day later, the second reminder goes out once, also under a race.
  const dayLater = Date.now() + 24 * 3600_000;
  await Promise.all([runReminders(dayLater), runReminders(dayLater)]);
  assert.equal((await mailTo("race-feedback-student@example.com", /A reminder: tell us how your lesson went/)).length, 1);
  assert.equal((await mailTo("race-feedback-tutor@example.com", /is waiting for their lesson write-up/)).length, 1);
});

test("before-the-lesson reminders: three runs at once send each email once", async () => {
  const { db } = await import("../db/database.ts");
  const { runReminders } = await import("./reminders.ts");
  const booking = await lesson("race-lesson");
  await db().bookings.updateOne({ id: booking.id }, { startsAt: new Date(Date.now() + 30 * 60_000).toISOString() });

  await Promise.all([runReminders(), runReminders(), runReminders()]);
  assert.equal((await mailTo("race-lesson-student@example.com", /starts within the hour/)).length, 1);
  assert.equal((await mailTo("race-lesson-tutor@example.com", /starts within the hour/)).length, 1);
});
