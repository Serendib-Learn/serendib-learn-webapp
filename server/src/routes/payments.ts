import type { Request, Response } from "express";
import { Router } from "express";
import { WebhookSignatureError } from "@payments-lk/node";
import { db } from "../db/database.ts";
import { confirmBooking } from "../lib/booking-confirmation.ts";
import { wrap } from "../lib/errors.ts";
import { nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import {
  paymentFromEvent,
  paymentsConfig,
  paymentsEnabled,
  refreshFromCheckout,
  verifyWebhook,
} from "../lib/payments.ts";
import type { Booking } from "../../../shared/types.ts";

export const paymentsRouter = Router();

/** Public: whether card payments are on, and the rate checkouts are priced at. */
paymentsRouter.get("/config", (_request, response) => {
  response.json(paymentsConfig());
});

/** The checkout a booking is waiting on, if this event is about it. */
async function bookingForCheckout(reference: string | null, checkoutId: string) {
  if (!reference) return null;
  const booking = await db().bookings.findById(reference);
  if (!booking || booking.payment?.checkoutId !== checkoutId) return null;
  return booking;
}

async function releaseSlot(booking: Booking, reason: string) {
  if (booking.status !== "awaiting_payment") return;
  await db().bookings.updateOne({ id: booking.id }, { status: "cancelled", cancelReason: reason });
}

/**
 * Payments.lk's webhook. Mounted in index.ts with a raw body parser, ahead of
 * express.json(), because the signature covers the exact bytes sent. Any 2xx
 * marks a delivery done; anything else is retried for up to a day, so an
 * error here is only thrown when a retry could actually help.
 */
export const paymentsWebhook = wrap(async (request: Request, response: Response) => {
  if (!paymentsEnabled()) {
    response.status(404).json({ error: "Payments are not configured." });
    return;
  }

  let event;
  try {
    event = verifyWebhook(request.body as Buffer, request.get("payments-signature"));
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      response.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  if (await db().paymentEvents.findById(event.id)) {
    response.json({ received: true, duplicate: true });
    return;
  }

  if (event.type === "payment.succeeded" || event.type === "payment.failed") {
    const payment = event.data;
    const booking = await bookingForCheckout(payment.reference, payment.checkoutId ?? "");
    if (booking?.payment) {
      const updated = paymentFromEvent(payment, booking.payment);

      if (event.type === "payment.succeeded") {
        // The amount comes from our own records when the checkout is made, but
        // check it anyway before treating the booking as paid.
        if (payment.amountCents !== booking.payment.amountCents) {
          console.error(
            `Payments.lk: ${payment.id} paid ${payment.amountCents} for booking ${booking.id}, which expected ${booking.payment.amountCents}. Not confirming.`,
          );
        } else {
          await confirmBooking(booking, { payment: updated });
        }
      } else {
        await db().bookings.updateOne({ id: booking.id }, { payment: updated });
      }
    }
  } else if (event.type === "checkout.expired") {
    // The event names only the checkout; its payment carries our reference.
    const outcome = await db().bookings.find({ status: "awaiting_payment" });
    const booking = outcome.find((item) => item.payment?.checkoutId === event.data.id);
    if (booking) {
      await releaseSlot(booking, "The checkout expired before payment.");
      const student = await db().users.findById(booking.studentId);
      if (student) {
        await deliver({
          to: student.email,
          subject: "Your lesson slot was released",
          body: "The checkout for your lesson expired before it was paid, so the slot has been released for others. You can book again from the portal calendar whenever you are ready.",
          kind: "notification",
        });
      }
    }
  }

  await db().paymentEvents.insertOne({ id: event.id, type: event.type, receivedAt: nowIso() });
  response.json({ received: true });
});

/**
 * Brings a booking up to date from its checkout, for when the webhook has not
 * arrived (it never does on localhost). Returns the booking as it now stands.
 */
export async function syncBookingPayment(booking: Booking): Promise<Booking> {
  if (!paymentsEnabled() || !booking.payment || booking.status !== "awaiting_payment") {
    return booking;
  }

  const outcome = await refreshFromCheckout(booking.payment);
  if (outcome.kind === "paid") {
    if (outcome.payment.amountCents !== booking.payment.amountCents) return booking;
    return confirmBooking(booking, { payment: outcome.payment });
  }
  if (outcome.kind === "expired") {
    await releaseSlot(booking, "The checkout expired before payment.");
  } else {
    await db().bookings.updateOne({ id: booking.id }, { payment: outcome.payment });
  }
  return (await db().bookings.findById(booking.id)) ?? booking;
}
