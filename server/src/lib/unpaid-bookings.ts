import { db } from "../db/database.ts";
import { confirmBooking } from "./booking-confirmation.ts";
import { deliver } from "./mail.ts";
import { paymentsConfig, paymentsEnabled, refreshFromCheckout } from "./payments.ts";
import type { Booking } from "../../../shared/types.ts";

/**
 * Bookings waiting for payment hold the tutor's hour (`blocksSlot`). These
 * make sure that hold ends: a booking nobody started paying for is released
 * after UNPAID_HOLD_MINUTES, and one whose checkout ran out after it expires
 * — the Terms promise unpaid bookings are released after about 30 minutes.
 */

/** How long a booking holds the hour before its checkout is opened. */
export const UNPAID_HOLD_MINUTES = 30;

/** Payments.lk's own expiry, plus time for a payment made at the last second to report back. */
const CHECKOUT_GRACE_MINUTES = 5;

/** Cancels an unpaid booking, freeing its hour. Does nothing once it is paid. */
export async function releaseSlot(booking: Booking, reason: string): Promise<boolean> {
  // Only if it is still unpaid, and still has the checkout (or lack of one)
  // we looked at: a checkout opened meanwhile keeps the hold.
  const current = await db().bookings.findById(booking.id);
  if (current?.status !== "awaiting_payment") return false;
  if (current.payment?.checkoutId !== booking.payment?.checkoutId) return false;
  const released = await db().bookings.updateOne(
    current.payment ? { id: booking.id, status: "awaiting_payment" } : { id: booking.id, status: "awaiting_payment", payment: { $exists: false } },
    { status: "cancelled", cancelReason: reason },
  );
  return released !== null;
}

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

async function tellStudent(booking: Booking) {
  const student = await db().users.findById(booking.studentId);
  if (!student) return;
  await deliver({
    to: student.email,
    subject: "Your lesson slot was released",
    body: "Your lesson was not paid for in time, so the hour has been released for others. Nothing has been charged. You can book again from the portal calendar whenever you are ready.",
    kind: "notification",
  });
}

/**
 * Releases every booking that has held its hour too long without being paid.
 * Run with the reminders (every few minutes). A checkout is asked first, in
 * case it was paid and the webhook never came; if it cannot be read, the
 * booking waits for the next run — unless it is a checkout from the other
 * mode (a sandbox one, now payments are live), which can never be paid.
 */
export async function releaseUnpaidBookings(now = Date.now()): Promise<number> {
  const waiting = await db().bookings.find({ status: "awaiting_payment" });
  let released = 0;

  for (const booking of waiting) {
    // A bundle's lessons are paid, and let go, together (lib/bundles.ts).
    if (booking.bundleId) continue;
    const holdEnds = booking.payment
      ? new Date(booking.payment.expiresAt).getTime() + CHECKOUT_GRACE_MINUTES * 60_000
      : new Date(booking.createdAt).getTime() + UNPAID_HOLD_MINUTES * 60_000;
    if (holdEnds > now) continue;

    if (booking.payment && paymentsEnabled()) {
      const otherMode = booking.payment.mode !== paymentsConfig().mode;
      if (!otherMode) {
        try {
          const current = await syncBookingPayment(booking);
          if (current.status === "cancelled") {
            released += 1;
            await tellStudent(current);
          }
          continue;
        } catch (error) {
          console.error(`Unpaid booking ${booking.id}: could not read its checkout, trying again later.`, error);
          continue;
        }
      }
    }

    const reason = booking.payment
      ? "The checkout expired before payment."
      : `Not paid within ${UNPAID_HOLD_MINUTES} minutes of booking.`;
    if (await releaseSlot(booking, reason)) {
      released += 1;
      await tellStudent(booking);
    }
  }

  return released;
}
