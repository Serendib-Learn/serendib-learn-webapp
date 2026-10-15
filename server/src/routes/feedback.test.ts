import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking, MailMessage, PendingFeedback } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

let slot = 0;

/** A paid lesson, then moved so that it ended `endedAgoMs` ago. */
async function finishedLesson(name: string, endedAgoMs = 5 * 60_000) {
  const tutor = await signedUpUser(harness, "tutor", `${name}-tutor@example.com`);
  const student = await signedUpUser(harness, "student", `${name}-student@example.com`);
  slot += 1;
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: new Date(Date.now() + (48 + slot * 3) * 3600_000).toISOString(),
    durationMins: 60,
    language: "sinhala",
    focus: "Family words",
  });
  const booking = created.body as Booking;
  await student.client.post(`/bookings/${booking.id}/pay`);

  // Same process as the API, so reach into its store to put the lesson in the past.
  const { db } = await import("../db/database.ts");
  await db().bookings.updateOne(
    { id: booking.id },
    { startsAt: new Date(Date.now() - endedAgoMs - 60 * 60_000).toISOString() },
  );
  return { tutor, student, booking };
}

async function mailTo(email: string): Promise<MailMessage[]> {
  const { body } = await harness.client().get("/mail");
  return (body as MailMessage[]).filter((item) => item.to === email);
}

test("pending: a lesson asks each side for their own part once it has ended", async () => {
  const tutor = await signedUpUser(harness, "tutor", "early-tutor@example.com");
  const student = await signedUpUser(harness, "student", "early-student@example.com");
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: new Date(Date.now() + 30 * 3600_000).toISOString(),
    durationMins: 60,
    language: "sinhala",
    focus: "Numbers",
  });
  await student.client.post(`/bookings/${created.body.id}/pay`);
  const notYet = await student.client.get("/feedback/pending");
  assert.deepEqual(notYet.body, [], "nothing to say before the lesson happens");

  const lesson = await finishedLesson("pending");
  const forStudent = (await lesson.student.client.get("/feedback/pending")).body as PendingFeedback[];
  assert.equal(forStudent.length, 1);
  assert.equal(forStudent[0].kind, "feedback");
  assert.equal(forStudent[0].other.id, lesson.tutor.user.id);

  const forTutor = (await lesson.tutor.client.get("/feedback/pending")).body as PendingFeedback[];
  assert.equal(forTutor[0].kind, "write-up");
});

test("feedback: the student rates once, the tutor hears about it", async () => {
  const { tutor, student, booking } = await finishedLesson("rated");

  const badRating = await student.client.post("/feedback", { bookingId: booking.id, rating: 6 });
  assert.equal(badRating.status, 400);

  const notTheStudent = await tutor.client.post("/feedback", { bookingId: booking.id, rating: 5 });
  assert.equal(notTheStudent.status, 403);

  const given = await student.client.post("/feedback", {
    bookingId: booking.id,
    rating: 5,
    comment: "Finally said a whole sentence to my aachchi.",
  });
  assert.equal(given.status, 201);

  const again = await student.client.post("/feedback", { bookingId: booking.id, rating: 4 });
  assert.equal(again.status, 409);

  const notice = await latestMail(harness, "rated-tutor@example.com", "notification");
  assert.match(notice?.subject ?? "", /★★★★★/);

  const pending = await student.client.get("/feedback/pending");
  assert.deepEqual(pending.body, []);

  const mine = await tutor.client.get(`/feedback?tutorId=${tutor.user.id}`);
  assert.equal(mine.body.length, 1);
  const theirs = await student.client.get(`/feedback?tutorId=${tutor.user.id}`);
  assert.equal(theirs.status, 403);
});

test("write-up: the tutor's note completes the lesson and reaches the student", async () => {
  const { tutor, student, booking } = await finishedLesson("written");

  const written = await tutor.client.post("/feedback/lesson-notes", {
    bookingId: booking.id,
    summary: "Greetings and family words.",
    wentWell: "Pronunciation of ආයුබෝවන්.",
    workOn: "Long vowels.",
    vocabIntroduced: ["අම්මා", "තාත්තා"],
  });
  assert.equal(written.status, 201);

  const lesson = await student.client.get(`/bookings/${booking.id}`);
  assert.equal(lesson.body.status, "completed");

  const notes = await student.client.get(`/lesson-notes?studentId=${student.user.id}`);
  assert.equal(notes.body[0].summary, "Greetings and family words.");

  const mail = await latestMail(harness, "written-student@example.com", "notification");
  assert.match(mail?.subject ?? "", /wrote up your lesson/);
});

test("voice notes: only the two people on the lesson can hear them, or attach them", async () => {
  const { tutor, student, booking } = await finishedLesson("voice");
  const audio = Buffer.from("not really opus, but bytes all the same");

  const uploaded = await student.client.post("/voice-notes", {
    bookingId: booking.id,
    mimeType: "audio/webm;codecs=opus",
    durationSec: 12,
    data: audio.toString("base64"),
  });
  assert.equal(uploaded.status, 201);
  const noteId = uploaded.body.id as string;

  const notAudio = await student.client.post("/voice-notes", {
    bookingId: booking.id,
    mimeType: "text/html",
    durationSec: 1,
    data: audio.toString("base64"),
  });
  assert.equal(notAudio.status, 400);

  // The tutor hears it, through the same cookie-carrying fetch the portal uses.
  const heard = await fetch(`${harness.baseUrl}/voice-notes/${noteId}`, {
    headers: { Cookie: await cookieOf(tutor.client) },
  });
  assert.equal(heard.status, 200);
  assert.equal(heard.headers.get("content-type"), "audio/webm");
  assert.deepEqual(Buffer.from(await heard.arrayBuffer()), audio);

  const outsider = await signedUpUser(harness, "student", "eavesdropper@example.com");
  const blocked = await outsider.client.get(`/voice-notes/${noteId}`);
  assert.equal(blocked.status, 403);

  // The tutor cannot pass the student's recording off as their own write-up.
  const borrowed = await tutor.client.post("/feedback/lesson-notes", {
    bookingId: booking.id,
    summary: "Covered things.",
    voiceNoteId: noteId,
  });
  assert.equal(borrowed.status, 400);

  const withVoice = await student.client.post("/feedback", {
    bookingId: booking.id,
    rating: 4,
    voiceNoteId: noteId,
  });
  assert.equal(withVoice.status, 201);
});

/**
 * A session cookie for the same account as `client`. The harness client keeps
 * its own cookie private, so this logs in again with a plain fetch.
 */
async function cookieOf(client: ReturnType<typeof harness.client>): Promise<string> {
  const me = await client.get("/auth/me");
  const email = me.body.user.email as string;
  const login = await fetch(`${harness.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  return (login.headers.get("set-cookie") ?? "").split(";")[0];
}

test("reminders: at the end of class, again a day later, then never", async () => {
  const { booking } = await finishedLesson("nudged");
  const cron = (secret: string) =>
    fetch(`${harness.baseUrl}/jobs/reminders`, {
      method: "POST",
      headers: { "X-Cron-Secret": secret },
    });

  assert.equal((await cron("wrong")).status, 403);

  await cron("test-cron-secret");
  const studentFirst = await mailTo("nudged-student@example.com");
  assert.ok(studentFirst.some((item) => /How was your lesson/.test(item.subject)));
  const tutorFirst = await mailTo("nudged-tutor@example.com");
  assert.ok(tutorFirst.some((item) => /Write up your lesson/.test(item.subject)));

  await cron("test-cron-secret");
  assert.equal(
    (await mailTo("nudged-student@example.com")).filter((item) => /lesson/.test(item.subject)).length,
    studentFirst.filter((item) => /lesson/.test(item.subject)).length,
    "running again straight away sends nothing new",
  );

  // A day passes.
  const { db } = await import("../db/database.ts");
  const current = (await db().bookings.findById(booking.id))!;
  await db().bookings.updateOne(
    { id: booking.id },
    { startsAt: new Date(new Date(current.startsAt).getTime() - 25 * 3600_000).toISOString() },
  );
  await cron("test-cron-secret");
  assert.ok(
    (await mailTo("nudged-student@example.com")).some((item) => /A reminder/.test(item.subject)),
  );

  const before = (await mailTo("nudged-student@example.com")).length;
  await cron("test-cron-secret");
  assert.equal((await mailTo("nudged-student@example.com")).length, before, "two reminders, no more");
});

test("lesson reminders: a day ahead and an hour ahead, to both people, once each", async () => {
  const tutor = await signedUpUser(harness, "tutor", "soon-tutor@example.com");
  const student = await signedUpUser(harness, "student", "soon-student@example.com");
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: new Date(Date.now() + 20 * 3600_000).toISOString(),
    durationMins: 60,
    language: "sinhala",
    focus: "Greetings",
  });
  await student.client.post(`/bookings/${created.body.id}/pay`);
  await tutor.client.post(`/bookings/${created.body.id}/meeting-link`, {
    url: "https://meet.google.com/abc-defg-hij",
  });

  const cron = () =>
    fetch(`${harness.baseUrl}/jobs/reminders`, {
      method: "POST",
      headers: { "X-Cron-Secret": "test-cron-secret" },
    });
  const reminders = async (email: string) =>
    (await mailTo(email)).filter((item) => /^Tomorrow:|within the hour/.test(item.subject));

  await cron();
  const studentDay = await reminders("soon-student@example.com");
  assert.equal(studentDay.length, 1);
  assert.match(studentDay[0].subject, /^Tomorrow: your lesson with Test Tutor/);
  assert.match(studentDay[0].body, /meet\.google\.com\/abc-defg-hij/);
  assert.match(studentDay[0].body, /\/portal\/calendar/);
  assert.equal((await reminders("soon-tutor@example.com")).length, 1);

  await cron();
  assert.equal((await reminders("soon-student@example.com")).length, 1, "not twice");

  const { db } = await import("../db/database.ts");
  await db().bookings.updateOne(
    { id: created.body.id },
    { startsAt: new Date(Date.now() + 30 * 60_000).toISOString() },
  );
  await cron();
  const later = await reminders("soon-student@example.com");
  assert.equal(later.length, 2);
  assert.ok(later.some((item) => /starts within the hour/.test(item.subject)));
});

test("google test actions refuse cleanly when nothing is connected", async () => {
  const { adminClient } = await import("../test-support/accounts.ts");
  const admin = await adminClient(harness);
  const mail = await admin.client.post("/integrations/google/mail/test");
  assert.equal(mail.status, 409);
  const calendar = await admin.client.post("/integrations/google/system-calendar/test");
  assert.equal(calendar.status, 409);
});
