import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startFakePaymentsLk, WEBHOOK_SECRET } from "../test-support/fake-payments-lk.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { Booking } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;
let payments: Awaited<ReturnType<typeof startFakePaymentsLk>>;

before(async () => {
  payments = await startFakePaymentsLk();
  harness = await startTestServer({
    PAYMENTS_LK_SECRET_KEY: "sk_test_fake",
    PAYMENTS_LK_WEBHOOK_SECRET: WEBHOOK_SECRET,
    PAYMENTS_LK_API_BASE: payments.apiBase,
    USD_TO_LKR: "300",
  });
});

after(async () => {
  await harness.close();
  await payments.close();
});

let slot = 0;
/** A tutor (approved, $25/hr default) and a student with a booking awaiting payment. */
async function awaitingBooking(name: string) {
  const tutor = await signedUpUser(harness, "tutor", `${name}-tutor@example.com`);
  const student = await signedUpUser(harness, "student", `${name}-student@example.com`);
  slot += 1;
  const created = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: new Date(Date.now() + (48 + slot * 3) * 3600_000).toISOString(),
    durationMins: 60,
    language: "sinhala",
    focus: "Greetings",
  });
  assert.equal(created.status, 201);
  return { tutor, student, booking: created.body as Booking };
}

async function postWebhook(event: unknown, signature?: string) {
  const body = JSON.stringify(event);
  const response = await fetch(`${harness.baseUrl}/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Payments-Signature": signature ?? payments.sign(body),
    },
    body,
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

test("config: reports test mode and the conversion rate", async () => {
  const { body } = await harness.client().get("/payments/config");
  assert.deepEqual(body, { enabled: true, mode: "test", usdToLkr: 300 });
});

test("checkout: priced in LKR from the USD rate, referenced to the booking, reused while open", async () => {
  const { student, booking } = await awaitingBooking("checkout");

  const first = await student.client.post(`/bookings/${booking.id}/checkout`);
  assert.equal(first.status, 200);
  assert.match(first.body.url, /^https:\/\/payments\.lk\/checkout\/chk_/);

  const sent = payments.requests.find((item) => item.method === "POST" && item.path === "/v1/checkouts");
  const body = sent?.body as Record<string, unknown>;
  assert.equal(body.amountCents, 25 * 300 * 100, "$25 at 300 LKR/USD = Rs. 7,500");
  assert.equal(body.reference, booking.id);
  assert.match(String(body.successUrl), new RegExp(`/portal/checkout/${booking.id}\\?status=returned$`));
  assert.ok(sent?.idempotencyKey, "every write carries an idempotency key");

  const again = await student.client.post(`/bookings/${booking.id}/checkout`);
  assert.equal(again.body.url, first.body.url, "an open checkout is reused, not duplicated");
});

test("demo /pay is refused for students once real payments are on, but admins can mark paid", async () => {
  const { student, booking } = await awaitingBooking("demo-pay");

  const refused = await student.client.post(`/bookings/${booking.id}/pay`);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, "use_checkout");

  const admin = await adminClient(harness);
  const marked = await admin.client.post(`/bookings/${booking.id}/pay`);
  assert.equal(marked.status, 200);
  assert.equal(marked.body.status, "confirmed");
});

test("webhook: an unsigned or wrongly signed delivery changes nothing", async () => {
  const { student, booking } = await awaitingBooking("forged");
  const checkout = await student.client.post(`/bookings/${booking.id}/checkout`);
  const checkoutId = (checkout.body.booking as Booking).payment!.checkoutId;
  const event = payments.pay(checkoutId);

  const forged = await postWebhook(event, payments.sign(JSON.stringify(event), "whsec_wrong"));
  assert.equal(forged.status, 400);

  const stale = await postWebhook(event, payments.sign(JSON.stringify(event), WEBHOOK_SECRET, 1_000));
  assert.equal(stale.status, 400, "a replay outside the 5 minute window is refused");

  const still = await student.client.get(`/bookings/${booking.id}`);
  assert.equal(still.body.status, "awaiting_payment");
});

test("webhook: payment.succeeded confirms the booking once, with a meeting link and receipt", async () => {
  const { student, booking } = await awaitingBooking("paid");
  const checkout = await student.client.post(`/bookings/${booking.id}/checkout`);
  const checkoutId = (checkout.body.booking as Booking).payment!.checkoutId;
  const event = payments.pay(checkoutId);

  const delivered = await postWebhook(event);
  assert.equal(delivered.status, 200);

  const confirmed = await student.client.get(`/bookings/${booking.id}`);
  assert.equal(confirmed.body.status, "confirmed");
  assert.ok(confirmed.body.meetingUrl);
  assert.equal(confirmed.body.payment.card, "VISA •••• 4242");

  const receipt = await latestMail(harness, "paid-student@example.com", "receipt");
  assert.match(receipt?.subject ?? "", /Rs\. 7,500/);

  const repeat = await postWebhook(event);
  assert.equal(repeat.body.duplicate, true, "a redelivery of the same event is a no-op");
});

test("webhook: a payment for the wrong amount does not confirm", async () => {
  const { student, booking } = await awaitingBooking("short");
  const checkout = await student.client.post(`/bookings/${booking.id}/checkout`);
  const checkoutId = (checkout.body.booking as Booking).payment!.checkoutId;

  await postWebhook(payments.pay(checkoutId, 100));
  const after = await student.client.get(`/bookings/${booking.id}`);
  assert.equal(after.body.status, "awaiting_payment");
});

test("webhook: checkout.expired releases the slot", async () => {
  const { student, booking } = await awaitingBooking("expired");
  const checkout = await student.client.post(`/bookings/${booking.id}/checkout`);
  const checkoutId = (checkout.body.booking as Booking).payment!.checkoutId;

  await postWebhook(payments.expire(checkoutId));
  const after = await student.client.get(`/bookings/${booking.id}`);
  assert.equal(after.body.status, "cancelled");
  assert.match(after.body.cancelReason, /expired/);
});

test("status check: confirms from the checkout itself when no webhook arrives (localhost)", async () => {
  const { student, tutor, booking } = await awaitingBooking("polled");
  const checkout = await student.client.post(`/bookings/${booking.id}/checkout`);
  const checkoutId = (checkout.body.booking as Booking).payment!.checkoutId;

  const before = await student.client.get(`/bookings/${booking.id}/payment`);
  assert.equal(before.body.status, "awaiting_payment");

  payments.pay(checkoutId); // paid on the hosted page; webhook never sent
  const after = await student.client.get(`/bookings/${booking.id}/payment`);
  assert.equal(after.body.status, "confirmed");

  const outsider = await signedUpUser(harness, "student", "nosy@example.com");
  const peek = await outsider.client.get(`/bookings/${booking.id}/payment`);
  assert.equal(peek.status, 403);

  const tutorView = await tutor.client.post(`/bookings/${booking.id}/checkout`);
  assert.equal(tutorView.status, 403, "only the student starts a checkout");
});
