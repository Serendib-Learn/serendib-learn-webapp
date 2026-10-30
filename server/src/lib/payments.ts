import { PaymentsLk } from "@payments-lk/node";
import type { Checkout, Payment } from "@payments-lk/node";
import { config } from "../config.ts";
import type { Booking, BookingPayment, PaymentsConfig, User } from "../../../shared/types.ts";

/**
 * Card payments through Payments.lk's hosted checkout. The browser is sent to
 * the checkout's own page; this server never sees a card number. A booking is
 * confirmed from the signed `payment.succeeded` webhook, or — as a fallback
 * for when the webhook cannot reach this server, which is always the case on
 * localhost — from reading the checkout back (`refreshFromCheckout`). The
 * browser's return to our success URL proves nothing and confirms nothing.
 */

let client: PaymentsLk | null = null;

export function paymentsEnabled(): boolean {
  return config.payments.secretKey !== "";
}

function lk(): PaymentsLk {
  if (!paymentsEnabled()) throw new Error("Payments.lk is not configured.");
  client ??= new PaymentsLk(config.payments.secretKey, {
    apiBase: config.payments.apiBase,
  });
  return client;
}

export function paymentsConfig(): PaymentsConfig {
  const key = config.payments.secretKey;
  return {
    enabled: paymentsEnabled(),
    mode: key.startsWith("sk_live_") ? "live" : key ? "test" : null,
    usdToLkr: config.payments.usdToLkr,
    lessonPriceLkr: config.payments.lessonPriceLkr,
  };
}

function cardLabel(payment: Payment): string | undefined {
  return payment.card ? `${payment.card.scheme} •••• ${payment.card.last4}` : undefined;
}

function record(checkout: Checkout): BookingPayment {
  return {
    provider: "payments.lk",
    mode: checkout.mode,
    checkoutId: checkout.id,
    checkoutUrl: checkout.url,
    expiresAt: checkout.expiresAt,
    amountCents: checkout.payment.amountCents,
    currency: "LKR",
    paymentId: checkout.payment.id,
    card: cardLabel(checkout.payment),
    failureMessage: checkout.payment.failureMessage ?? undefined,
  };
}

/**
 * A checkout for this booking. Reuses the current one while it can still take
 * a payment, so a double click or a page refresh never makes two.
 */
export async function checkoutFor(
  booking: Booking,
  student: User,
  tutor: User,
): Promise<BookingPayment> {
  const existing = booking.payment;
  if (existing && new Date(existing.expiresAt).getTime() - Date.now() > 60_000) {
    const current = await lk().checkouts.retrieve(existing.checkoutId);
    if (current.status === "open") return record(current);
  }

  const language = booking.language === "tamil" ? "Tamil" : "Sinhala";
  const description = `${booking.durationMins}-minute ${language} lesson with ${tutor.name}`.slice(0, 120);
  const back = `${config.appUrl}/portal/checkout/${booking.id}`;

  const checkout = await lk().checkouts.create(
    {
      amountCents: booking.priceLkr * 100,
      description,
      reference: booking.id,
      customer: { name: student.name.slice(0, 80).padEnd(2, "."), email: student.email },
      successUrl: `${back}?status=returned`,
      cancelUrl: `${back}?status=cancelled`,
      // Expiry is the API's default, 30 minutes: long enough to pay, short
      // enough that an abandoned checkout does not hold the slot for long.
    },
    // A fresh key per attempt: an earlier checkout for this booking may have
    // expired, and the same key would hand that one back.
    { idempotencyKey: `booking-${booking.id}-${Date.now()}` },
  );

  return record(checkout);
}

export type CheckoutOutcome =
  | { kind: "paid"; payment: BookingPayment }
  | { kind: "expired" }
  | { kind: "pending"; payment: BookingPayment };

/** Reads the booking's checkout back from Payments.lk. */
export async function refreshFromCheckout(payment: BookingPayment): Promise<CheckoutOutcome> {
  const checkout = await lk().checkouts.retrieve(payment.checkoutId);
  const latest = record(checkout);

  if (checkout.payment.status === "succeeded") return { kind: "paid", payment: latest };
  if (checkout.status === "expired" || checkout.status === "canceled") return { kind: "expired" };
  return { kind: "pending", payment: latest };
}

/** Verifies a webhook delivery and returns the event, or throws. */
export function verifyWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!config.payments.webhookSecret) {
    throw new Error("PAYMENTS_LK_WEBHOOK_SECRET is not set, so webhooks cannot be verified.");
  }
  return lk().webhooks.constructEvent(rawBody, signature, config.payments.webhookSecret);
}

/** The webhook's payment, in the shape stored on a booking. */
export function paymentFromEvent(payment: Payment, previous: BookingPayment): BookingPayment {
  return {
    ...previous,
    paymentId: payment.id,
    amountCents: payment.amountCents,
    card: cardLabel(payment) ?? previous.card,
    failureMessage: payment.failureMessage ?? undefined,
  };
}
