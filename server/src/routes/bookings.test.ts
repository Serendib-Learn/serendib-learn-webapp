import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startTestServer } from "../test-support/harness.ts";
import type { MailMessage } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

async function codeSentTo(email: string): Promise<string> {
  const { body } = await harness.client().get("/mail");
  const message = (body as MailMessage[])
    .filter((item) => item.kind === "verification" && item.to === email)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
  assert.ok(message?.code, `expected a verification code sent to ${email}`);
  return message.code;
}

/** A verified, logged-in account of the given role, with its own cookie jar. */
async function signedUpUser(role: "student" | "tutor", email: string) {
  const client = harness.client();
  await client.post("/auth/signup", {
    name: role === "tutor" ? "Test Tutor" : "Test Student",
    email,
    password: "password123",
    role,
    languages: ["sinhala"],
  });
  const code = await codeSentTo(email);
  const verified = await client.post("/auth/verify", { email, code });
  return { client, user: verified.body.user as { id: string } };
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

test("booking lifecycle: create -> slot clash -> pay -> complete, with authorization at each step", async () => {
  const tutor = await signedUpUser("tutor", "lifecycle-tutor@example.com");
  const student = await signedUpUser("student", "lifecycle-student@example.com");
  const outsider = await signedUpUser("student", "lifecycle-outsider@example.com");

  const startsAt = hoursFromNow(24);

  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt,
    durationMins: 60,
    language: "sinhala",
    focus: "Ordering food",
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "awaiting_payment");
  assert.equal(created.body.priceUsd, 25, "default $25/hr rate, 60 minutes");
  const bookingId = created.body.id as string;

  // Same tutor, overlapping time, different student — must clash regardless of who asks.
  const overlapping = await outsider.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: hoursFromNow(24.25), // 15 minutes into the first booking
    durationMins: 30,
    language: "sinhala",
    focus: "Also ordering food",
  });
  assert.equal(overlapping.status, 400);
  assert.match(overlapping.body.error, /Someone just took that slot/);

  // Someone who is neither the tutor nor the student on this booking.
  const outsiderView = await outsider.client.get(`/bookings/${bookingId}`);
  assert.equal(outsiderView.status, 403);

  const paid = await student.client.post(`/bookings/${bookingId}/pay`);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.status, "confirmed");
  assert.ok(paid.body.meetingUrl, "gets a meeting link even with no Google Calendar connected");

  // The student's membership flips to active on their first paid booking.
  const meAfterPay = await student.client.get("/auth/me");
  assert.equal(meAfterPay.body.user.membership, "active");

  // Only the tutor (or an admin) closes out a session.
  const studentTriesComplete = await student.client.post(`/bookings/${bookingId}/complete`);
  assert.equal(studentTriesComplete.status, 403);

  const completed = await tutor.client.post(`/bookings/${bookingId}/complete`);
  assert.equal(completed.status, 200);
  assert.equal(completed.body.status, "completed");

  const cancelAfterComplete = await student.client.post(`/bookings/${bookingId}/cancel`);
  assert.equal(cancelAfterComplete.status, 400);
  assert.match(cancelAfterComplete.body.error, /already happened/);
});

test("booking create: rejects a slot in the past and an unsupported duration", async () => {
  const tutor = await signedUpUser("tutor", "validation-tutor@example.com");
  const student = await signedUpUser("student", "validation-student@example.com");

  const inThePast = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: hoursFromNow(-1),
    durationMins: 60,
    language: "sinhala",
    focus: "Time travel",
  });
  assert.equal(inThePast.status, 400);
  assert.match(inThePast.body.error, /past/);

  const badDuration = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: hoursFromNow(24),
    durationMins: 45,
    language: "sinhala",
    focus: "Odd length session",
  });
  assert.equal(badDuration.status, 400);
  assert.match(badDuration.body.error, /30, 60, 90 or 120/);
});

test("booking create: a student account cannot be booked as the tutor", async () => {
  const notATutor = await signedUpUser("student", "not-a-tutor@example.com");
  const student = await signedUpUser("student", "booker@example.com");

  const attempt = await student.client.post("/bookings", {
    tutorId: notATutor.user.id,
    startsAt: hoursFromNow(24),
    durationMins: 60,
    language: "sinhala",
    focus: "Should not work",
  });
  assert.equal(attempt.status, 400);
  assert.match(attempt.body.error, /does not teach/);
});
