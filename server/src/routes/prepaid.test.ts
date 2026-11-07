import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking, LessonCredit, MailMessage, Slot, TutorHoursSummary } from "../../../shared/types.ts";

/**
 * Prepaid lessons: a student who paid outside the site (a bank transfer, or
 * before the portal launched) is given lessons to book by an administrator.
 */

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

type Person = Awaited<ReturnType<typeof signedUpUser>>;

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

async function busyTutor(email: string): Promise<Person> {
  const tutor = await signedUpUser(harness, "tutor", email);
  for (let weekday = 0; weekday < 7; weekday += 1) {
    assert.equal((await tutor.client.post("/availability", { weekday, start: "08:00", end: "20:00" })).status, 201);
  }
  return tutor;
}

async function openSlots(tutor: Person, hoursAhead: number): Promise<Slot[]> {
  const { body } = await harness.client().get(`/availability/slots?tutorId=${tutor.user.id}&days=10`);
  return (body as Slot[]).filter((slot) => new Date(slot.startsAt).getTime() > Date.now() + hoursAhead * 3600_000);
}

async function bookWithCredit(student: Person, tutor: Person, slot: Slot): Promise<Booking> {
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: slot.startsAt,
    durationMins: 60,
    language: "sinhala",
    focus: "Greetings",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const used = await student.client.post(`/bookings/${created.body.id}/use-credit`);
  assert.equal(used.status, 200, JSON.stringify(used.body));
  return used.body as Booking;
}

async function adminMail(subject: RegExp): Promise<MailMessage | undefined> {
  const { body } = await harness.client().get("/mail");
  return (body as MailMessage[]).filter((item) => subject.test(item.subject)).sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
}

test("an administrator adds prepaid lessons: one email to the student, and each lesson holds its share of the payment", async () => {
  const admin = await adminClient(harness);
  const student = await signedUpUser(harness, "student", "prepaid-student@example.com");
  const tutor = await signedUpUser(harness, "tutor", "prepaid-not-a-student@example.com");

  const input = { studentId: student.user.id, lessons: 4, amountLkr: 20000, paidOn: daysAgo(3), note: "Bank transfer" };
  assert.equal((await student.client.post("/requests/credits/prepaid", input)).status, 403);

  const added = await admin.client.post("/requests/credits/prepaid", input);
  assert.equal(added.status, 201, JSON.stringify(added.body));
  const credits = added.body as LessonCredit[];
  assert.equal(credits.length, 4);
  for (const credit of credits) {
    assert.equal(credit.reason, "prepaid");
    assert.equal(credit.studentId, student.user.id);
    assert.equal(credit.amountLkr, 5000);
    assert.equal(credit.paidOn, input.paidOn);
    assert.equal(credit.paymentNote, "Bank transfer");
  }

  const mine = await student.client.get("/requests/credits");
  assert.equal(mine.body.available, 4);
  const { body: mail } = await harness.client().get("/mail");
  const toStudent = (mail as MailMessage[]).filter((item) => item.to === "prepaid-student@example.com" && /prepaid/i.test(item.subject));
  assert.equal(toStudent.length, 1, "one email for the whole pack, not one per lesson");
  assert.match(toStudent[0].body, /4 prepaid lessons/);

  const log = (await admin.client.get("/users/audit-log")).body as { action: string; targetLabel: string; detail?: string }[];
  const entry = log.find((item) => item.action === "prepaid_lessons_added");
  assert.ok(entry, "the grant is in the audit log");
  assert.match(entry.detail ?? "", /4 lessons/);

  const bad = [
    { ...input, lessons: 0 },
    { ...input, lessons: 101 },
    { ...input, amountLkr: 0 },
    { ...input, paidOn: "not a date" },
    { ...input, paidOn: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10) },
    { ...input, studentId: tutor.user.id },
  ];
  for (const body of bad) {
    const response = await admin.client.post("/requests/credits/prepaid", body);
    assert.ok(response.status === 400 || response.status === 404, `${JSON.stringify(body)} gave ${response.status}`);
  }
  assert.equal((await student.client.get("/requests/credits")).body.available, 4, "nothing added by the bad requests");
});

test("a lesson booked with a prepaid lesson says prepaid, not free, and the report counts it as prepaid", async () => {
  const admin = await adminClient(harness);
  const tutor = await busyTutor("prepaid-booking-tutor@example.com");
  const student = await signedUpUser(harness, "student", "prepaid-booker@example.com");
  await admin.client.post("/requests/credits/prepaid", {
    studentId: student.user.id,
    lessons: 2,
    amountLkr: 10000,
    paidOn: today(),
  });
  const [slot] = await openSlots(tutor, 30);

  const booking = await bookWithCredit(student, tutor, slot);
  assert.equal(booking.status, "confirmed");

  const receipt = await latestMail(harness, "prepaid-booker@example.com", "receipt");
  assert.match(receipt?.subject ?? "", /prepaid/i);
  assert.doesNotMatch(receipt?.body ?? "", /free lesson/i);
  const toTutor = await latestMail(harness, "prepaid-booking-tutor@example.com", "notification");
  assert.doesNotMatch(toTutor?.body ?? "", /free lesson/i);

  const from = new Date(Date.now() - 86_400_000).toISOString();
  const to = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const report = await admin.client.get(`/reports/tutor-hours?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  assert.equal(report.status, 200);
  const mine = (report.body.tutors as TutorHoursSummary[]).find((item) => item.tutorId === tutor.user.id);
  const lesson = mine?.lessons.find((item) => item.bookingId === booking.id);
  assert.equal(lesson?.paidWith, "prepaid");
  assert.equal(lesson?.amountCents, 500000);
  assert.equal(mine?.freeLessons, 0, "prepaid lessons are not free lessons");
  assert.equal(mine?.cardCents, 0, "nor card payments");

  // Cancelled in good time, the prepaid lesson comes back, still prepaid.
  assert.equal((await student.client.post(`/bookings/${booking.id}/cancel`)).status, 200);
  const credits = (await student.client.get("/requests/credits")).body as { available: number; credits: LessonCredit[] };
  assert.equal(credits.available, 2);
  assert.ok(credits.credits.every((credit) => credit.reason === "prepaid"));
});

test("asking for a refund of prepaid lessons tells the administrators, with the payment date", async () => {
  const admin = await adminClient(harness);
  const student = await signedUpUser(harness, "student", "prepaid-refund@example.com");
  const noPrepaid = await signedUpUser(harness, "student", "prepaid-none@example.com");
  const tutor = await signedUpUser(harness, "tutor", "prepaid-refund-tutor@example.com");
  await admin.client.post("/requests/credits/prepaid", {
    studentId: student.user.id,
    lessons: 3,
    amountLkr: 15000,
    paidOn: daysAgo(45),
    note: "Paid before launch",
  });

  assert.equal((await noPrepaid.client.post("/requests/credits/refund", { message: "Please refund me" })).status, 409);
  assert.equal((await tutor.client.post("/requests/credits/refund", {})).status, 403);
  assert.equal((await harness.client().post("/requests/credits/refund", {})).status, 401);

  const asked = await student.client.post("/requests/credits/refund", { message: "Moving abroad, sorry!" });
  assert.equal(asked.status, 202, JSON.stringify(asked.body));

  const toAdmin = await adminMail(/refund/i);
  assert.ok(toAdmin, "the administrators are emailed");
  assert.match(toAdmin.subject, new RegExp(student.user.name));
  assert.match(toAdmin.body, /3 unused prepaid lessons/);
  assert.match(toAdmin.body, /Rs 15,000/);
  assert.match(toAdmin.body, /more than 30 days/);
  assert.match(toAdmin.body, /Moving abroad, sorry!/);
  assert.equal((await student.client.get("/requests/credits")).body.available, 3, "asking changes nothing by itself");
});

test("marking a prepaid lesson refunded says it went back by bank transfer", async () => {
  const admin = await adminClient(harness);
  const student = await signedUpUser(harness, "student", "prepaid-refunded@example.com");
  const added = await admin.client.post("/requests/credits/prepaid", {
    studentId: student.user.id,
    lessons: 1,
    amountLkr: 5000,
    paidOn: today(),
  });
  const [credit] = added.body as LessonCredit[];

  const refunded = await admin.client.post(`/requests/credits/${credit.id}/refunded`);
  assert.equal(refunded.status, 200);
  const mail = await latestMail(harness, "prepaid-refunded@example.com", "notification");
  assert.match(mail?.body ?? "", /bank transfer/i);
  assert.doesNotMatch(mail?.body ?? "", /card/i);
  assert.equal((await student.client.get("/requests/credits")).body.available, 0);
});
