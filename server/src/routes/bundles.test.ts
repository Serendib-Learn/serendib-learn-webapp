import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { signedUpUser } from "../test-support/accounts.ts";
import { startFakePaymentsLk, WEBHOOK_SECRET } from "../test-support/fake-payments-lk.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking, BundleDetail, MailMessage, Slot } from "../../../shared/types.ts";

/** Bundles: 5 or 10 lessons with any tutors, booked together and paid for once. */

let harness: Awaited<ReturnType<typeof startTestServer>>;
let payments: Awaited<ReturnType<typeof startFakePaymentsLk>>;

before(async () => {
  payments = await startFakePaymentsLk();
  harness = await startTestServer({
    PAYMENTS_LK_SECRET_KEY: "sk_test_fake",
    PAYMENTS_LK_WEBHOOK_SECRET: WEBHOOK_SECRET,
    PAYMENTS_LK_API_BASE: payments.apiBase,
  });
});

after(async () => {
  await harness.close();
  await payments.close();
});

type Person = Awaited<ReturnType<typeof signedUpUser>>;

/** A tutor open 08:00–20:00 every day. */
async function openTutor(email: string): Promise<{ tutor: Person; slots: Slot[] }> {
  const tutor = await signedUpUser(harness, "tutor", email);
  for (let weekday = 0; weekday < 7; weekday += 1) {
    await tutor.client.post("/availability", { weekday, start: "08:00", end: "20:00" });
  }
  const { body } = await harness.client().get(`/availability/slots?tutorId=${tutor.user.id}&days=20`);
  return { tutor, slots: body as Slot[] };
}

const lesson = (tutor: Person, slot: Slot) => ({
  tutorId: tutor.user.id,
  startsAt: slot.startsAt,
  language: "sinhala",
  focus: "Conversation",
});

async function mailTo(email: string): Promise<MailMessage[]> {
  const { body } = await harness.client().get("/mail");
  return (body as MailMessage[]).filter((mail) => mail.to === email);
}

async function webhook(event: unknown) {
  const body = JSON.stringify(event);
  return fetch(`${harness.baseUrl}/payments/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Payments-Signature": payments.sign(body) },
    body,
  });
}

let next = 0;
/** Five hours across two tutors, never the same hour twice. */
function fiveLessons(a: { tutor: Person; slots: Slot[] }, b: { tutor: Person; slots: Slot[] }) {
  const base = next;
  next += 3;
  return [
    lesson(a.tutor, a.slots[base]),
    lesson(a.tutor, a.slots[base + 40]),
    lesson(a.tutor, a.slots[base + 80]),
    lesson(b.tutor, b.slots[base + 1]),
    lesson(b.tutor, b.slots[base + 41]),
  ];
}

test("a bundle of 5 across two tutors: one checkout, one receipt, every lesson confirmed", async () => {
  const a = await openTutor("bundle-a-tutor@example.com");
  const b = await openTutor("bundle-b-tutor@example.com");
  const student = await signedUpUser(harness, "student", "bundle-student@example.com");

  const created = await student.client.post("/bundles", { lessons: fiveLessons(a, b) });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const { bundle, bookings } = created.body as BundleDetail;
  assert.equal(bundle.size, 5);
  assert.equal(bundle.priceLkr, 25000);
  assert.equal(bookings.length, 5);
  assert.ok(bookings.every((booking) => booking.bundleId === bundle.id && booking.status === "awaiting_payment"));

  // Its lessons are paid for with the bundle, never one at a time.
  const single = await student.client.post(`/bookings/${bookings[0].id}/checkout`);
  assert.equal(single.status, 409);
  assert.equal(single.body.code, "in_bundle");
  assert.equal((await student.client.post(`/bundles/${bundle.id}/pay`)).status, 409, "no demo pay once cards are on");

  // Someone else can't see or pay for it.
  const stranger = await signedUpUser(harness, "student", "bundle-stranger@example.com");
  assert.equal((await stranger.client.get(`/bundles/${bundle.id}`)).status, 403);

  const checkout = await student.client.post(`/bundles/${bundle.id}/checkout`);
  assert.equal(checkout.status, 200, JSON.stringify(checkout.body));
  const sent = payments.requests.filter((item) => item.method === "POST" && item.path === "/v1/checkouts").at(-1);
  const body = sent?.body as Record<string, unknown>;
  assert.equal(body.amountCents, 25000 * 100, "one payment for all five");
  assert.equal(body.reference, bundle.id);
  assert.match(String(body.successUrl), new RegExp(`/portal/checkout/bundle/${bundle.id}\\?status=returned$`));

  const { db } = await import("../db/database.ts");
  const checkoutId = (await db().bundles.findById(bundle.id))!.payment!.checkoutId;
  const paid = await webhook(payments.pay(checkoutId));
  assert.equal(paid.status, 200);

  const after = (await student.client.get(`/bundles/${bundle.id}`)).body as BundleDetail;
  assert.equal(after.bundle.status, "confirmed");
  assert.ok(after.bookings.every((booking: Booking) => booking.status === "confirmed"));
  assert.ok(after.bookings.every((booking: Booking) => booking.payment?.amountCents === 500000), "each lesson carries its share");

  const receipts = (await mailTo("bundle-student@example.com")).filter((mail) => mail.kind === "receipt");
  assert.equal(receipts.length, 1, "one receipt, not five");
  assert.match(receipts[0].subject, /Rs\. 25,000 for 5 lessons/);
  assert.equal((await mailTo("bundle-a-tutor@example.com")).filter((mail) => /New booking/.test(mail.subject)).length, 1);
  assert.match(
    (await mailTo("bundle-a-tutor@example.com")).find((mail) => /New booking/.test(mail.subject))?.subject ?? "",
    /3 lessons/,
  );

  // Once paid, each lesson follows the usual rules: cancelled in good time, it is kept as a free lesson.
  assert.equal((await student.client.post(`/bookings/${bookings[4].id}/cancel`)).status, 200);
  assert.equal((await student.client.get("/requests/credits")).body.available, 1);
});

test("bundles are checked: the right size, open hours, no two at once, a language the tutor teaches", async () => {
  const a = await openTutor("check-a-tutor@example.com");
  const b = await openTutor("check-b-tutor@example.com");
  const student = await signedUpUser(harness, "student", "check-student@example.com");
  const five = fiveLessons(a, b);

  assert.equal((await student.client.post("/bundles", { lessons: five.slice(0, 4) })).status, 400, "4 is not a bundle");
  assert.equal(
    (await student.client.post("/bundles", { lessons: [...five.slice(0, 4), { ...five[0] }] })).status,
    400,
    "the same hour twice",
  );
  assert.equal(
    (await student.client.post("/bundles", { lessons: [...five.slice(0, 4), { ...five[4], startsAt: "2026-01-01T03:30:00.000Z" }] })).status,
    400,
    "not an open hour",
  );
  assert.equal(
    (await student.client.post("/bundles", { lessons: [...five.slice(0, 4), { ...five[4], language: "tamil" }] })).status,
    400,
    "the tutor teaches Sinhala only",
  );
  assert.equal((await a.tutor.client.post("/bundles", { lessons: five })).status, 403, "students book bundles");
});

test("an unpaid bundle lets go together: cancelling one lesson, or 30 minutes without a checkout", async () => {
  const { db } = await import("../db/database.ts");
  const { releaseUnpaidBundles } = await import("../lib/bundles.ts");
  const a = await openTutor("free-a-tutor@example.com");
  const b = await openTutor("free-b-tutor@example.com");
  const student = await signedUpUser(harness, "student", "free-student@example.com");

  const first = (await student.client.post("/bundles", { lessons: fiveLessons(a, b) })).body as BundleDetail;
  assert.equal((await student.client.post(`/bookings/${first.bookings[2].id}/cancel`)).status, 200);
  const afterCancel = (await student.client.get(`/bundles/${first.bundle.id}`)).body as BundleDetail;
  assert.equal(afterCancel.bundle.status, "cancelled");
  assert.ok(afterCancel.bookings.every((booking: Booking) => booking.status === "cancelled"));

  const second = (await student.client.post("/bundles", { lessons: fiveLessons(a, b) })).body as BundleDetail;
  await db().bundles.updateOne({ id: second.bundle.id }, { createdAt: new Date(Date.now() - 31 * 60_000).toISOString() });
  assert.ok((await releaseUnpaidBundles()) >= 1);
  const released = (await student.client.get(`/bundles/${second.bundle.id}`)).body as BundleDetail;
  assert.equal(released.bundle.status, "cancelled");
  assert.ok(released.bookings.every((booking: Booking) => booking.status === "cancelled"));
  assert.ok((await mailTo("free-student@example.com")).some((mail) => /lessons were released/.test(mail.subject)));

  // The hours are free again: the same five can be booked.
  const again = await student.client.post("/bundles", {
    lessons: second.bookings.map((booking) => ({ tutorId: booking.tutorId, startsAt: booking.startsAt, language: "sinhala", focus: "" })),
  });
  assert.equal(again.status, 201, JSON.stringify(again.body));
});

test("a bundle paid without the webhook is confirmed when the checkout page checks", async () => {
  const a = await openTutor("sync-a-tutor@example.com");
  const b = await openTutor("sync-b-tutor@example.com");
  const student = await signedUpUser(harness, "student", "sync-student@example.com");
  const { bundle } = (await student.client.post("/bundles", { lessons: fiveLessons(a, b) })).body as BundleDetail;
  await student.client.post(`/bundles/${bundle.id}/checkout`);

  const { db } = await import("../db/database.ts");
  payments.pay((await db().bundles.findById(bundle.id))!.payment!.checkoutId);
  const synced = (await student.client.get(`/bundles/${bundle.id}`)).body as BundleDetail;
  assert.equal(synced.bundle.status, "confirmed");
  assert.ok(synced.bookings.every((booking: Booking) => booking.status === "confirmed"));
});
