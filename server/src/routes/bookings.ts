import { Router } from "express";
import { db, SYSTEM_CALENDAR_ID } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { blocksSlot, isBookableTutor, overlaps, priceFor, requireUserRecord } from "../lib/domain.ts";
import { confirmBooking } from "../lib/booking-confirmation.ts";
import { deleteGoogleMeeting } from "../lib/google.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { checkoutFor, paymentsEnabled } from "../lib/payments.ts";
import { requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import { syncBookingPayment } from "./payments.ts";
import type { Booking, LanguageCode, User } from "../../../shared/types.ts";

export const bookingsRouter = Router();

const byStart = (a: Booking, b: Booking) => a.startsAt.localeCompare(b.startsAt);

/** Both sides of a booking, plus any administrator, may act on it. */
function assertParty(booking: Booking, actor: User) {
  const involved = booking.studentId === actor.id || booking.tutorId === actor.id;
  if (!involved && actor.role !== "admin") {
    throw forbidden("That booking is not yours.");
  }
}

async function load(id: string): Promise<Booking> {
  const booking = await db().bookings.findById(id);
  if (!booking) throw notFound("That booking has gone.");
  return booking;
}

bookingsRouter.get(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const userId = String(request.query.userId ?? actor.id);
    requireSelfOrAdmin(request, userId);

    const asStudent = await db().bookings.find({ studentId: userId });
    const asTutor = await db().bookings.find({ tutorId: userId });

    response.json([...asStudent, ...asTutor].sort(byStart));
  }),
);

bookingsRouter.get(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const booking = await load(pathParam(request, "id"));
    assertParty(booking, requireUser(request));
    response.json(booking);
  }),
);

bookingsRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const body = (request.body ?? {}) as Record<string, unknown>;

    const studentId = String(body.studentId ?? actor.id);
    const tutorId = String(body.tutorId ?? "");
    const startsAt = String(body.startsAt ?? "");
    const durationMins = Number(body.durationMins ?? 60);
    const language = body.language === "tamil" ? "tamil" : "sinhala";
    const focus = String(body.focus ?? "").trim();

    requireSelfOrAdmin(request, studentId);

    if (!tutorId) throw new ApiError("Pick a tutor.");
    if (!focus) throw new ApiError("Say what the session should cover.");

    const startMs = new Date(startsAt).getTime();
    if (Number.isNaN(startMs)) throw new ApiError("That start time is not a date.");
    if (startMs < Date.now()) throw new ApiError("That slot is in the past.");
    if (![30, 60, 90, 120].includes(durationMins)) {
      throw new ApiError("Sessions run 30, 60, 90 or 120 minutes.");
    }

    const tutor = await requireUserRecord(tutorId);
    if (tutor.role !== "tutor") throw new ApiError("That account does not teach.");
    if (!isBookableTutor(tutor)) {
      throw new ApiError("That tutor is not taking bookings yet.");
    }

    const endMs = startMs + durationMins * 60 * 1000;
    const existing = await db().bookings.find({ tutorId });
    const clash = existing.filter(blocksSlot).some((booking) => {
      const bookedStart = new Date(booking.startsAt).getTime();
      return overlaps(
        startMs,
        endMs,
        bookedStart,
        bookedStart + booking.durationMins * 60 * 1000,
      );
    });
    if (clash) throw new ApiError("Someone just took that slot. Pick another one.");

    const booking: Booking = {
      id: newId("bk"),
      tutorId,
      studentId,
      startsAt: new Date(startMs).toISOString(),
      durationMins,
      language: language as LanguageCode,
      focus,
      status: "awaiting_payment",
      priceUsd: priceFor(tutor, durationMins),
      createdAt: nowIso(),
    };

    response.status(201).json(await db().bookings.insertOne(booking));
  }),
);

/**
 * Starts (or resumes) the card payment for a booking: returns the hosted
 * checkout to send the browser to. Only the student, or an admin.
 */
bookingsRouter.post(
  "/:id/checkout",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));
    if (booking.studentId !== actor.id && actor.role !== "admin") {
      throw forbidden("Only the student pays for a booking.");
    }
    if (!paymentsEnabled()) {
      throw new ApiError("Card payments are not switched on.", 409, "payments_disabled");
    }
    if (booking.status !== "awaiting_payment") {
      throw new ApiError("That booking is not waiting for payment.");
    }

    const student = await requireUserRecord(booking.studentId);
    const tutor = await requireUserRecord(booking.tutorId);
    const payment = await checkoutFor(booking, student, tutor);
    const updated = await db().bookings.updateOne({ id: booking.id }, { payment });

    response.json({ url: payment.checkoutUrl, booking: updated });
  }),
);

/**
 * The booking, brought up to date from Payments.lk first. The checkout page
 * polls this after the customer comes back, because the webhook is what
 * confirms a payment and it may arrive a moment later — or, on localhost,
 * never.
 */
bookingsRouter.get(
  "/:id/payment",
  requireAuth,
  wrap(async (request, response) => {
    const booking = await load(pathParam(request, "id"));
    assertParty(booking, requireUser(request));
    response.json(await syncBookingPayment(booking));
  }),
);

/**
 * Confirms a booking without taking a card. This is the demo checkout while
 * Payments.lk is not configured; once it is, only an administrator can do it
 * — to record a payment taken some other way, a bank transfer say.
 */
bookingsRouter.post(
  "/:id/pay",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));
    assertParty(booking, actor);

    if (paymentsEnabled() && actor.role !== "admin") {
      throw new ApiError("Pay through the card checkout.", 409, "use_checkout");
    }

    if (booking.status === "confirmed") {
      response.json(booking);
      return;
    }
    if (booking.status !== "awaiting_payment") {
      throw new ApiError("That booking is not waiting for payment.");
    }

    response.json(await confirmBooking(booking));
  }),
);

bookingsRouter.post(
  "/:id/cancel",
  requireAuth,
  wrap(async (request, response) => {
    const booking = await load(pathParam(request, "id"));
    assertParty(booking, requireUser(request));

    if (booking.status === "completed") {
      throw new ApiError("That session already happened.");
    }

    if (booking.googleEventId) {
      const calendar =
        booking.googleCalendarOwner === "system" ? SYSTEM_CALENDAR_ID : booking.tutorId;
      const linked = await db().googleAccounts.findById(calendar);
      if (linked) await deleteGoogleMeeting(linked.refreshToken, booking.googleEventId);
    }

    response.json(await db().bookings.updateOne({ id: booking.id }, { status: "cancelled" }));
  }),
);

/**
 * Puts a meeting link on a booking by hand — when no Google calendar made one,
 * or the tutor prefers their own room. Only the booking's tutor, or an admin.
 */
bookingsRouter.post(
  "/:id/meeting-link",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));
    if (booking.tutorId !== actor.id && actor.role !== "admin") {
      throw forbidden("Only the tutor sets the meeting link.");
    }
    if (booking.status !== "confirmed") {
      throw new ApiError("Only a confirmed session takes a meeting link.");
    }

    let url: URL;
    try {
      url = new URL(String(request.body?.url ?? "").trim());
    } catch {
      throw new ApiError("That does not look like a link. Paste the whole https:// address.");
    }
    if (url.protocol !== "https:") throw new ApiError("Meeting links must start with https://.");

    const updated = await db().bookings.updateOne({ id: booking.id }, { meetingUrl: url.toString() });

    const student = await db().users.findById(booking.studentId);
    if (student) {
      await deliver({
        to: student.email,
        subject: "Your meeting link is ready",
        body: `The link for your lesson on ${new Date(booking.startsAt).toLocaleString()}:\n\n${url.toString()}\n\nIt is also on the booking in your portal.`,
        kind: "notification",
      });
    }

    response.json(updated);
  }),
);

bookingsRouter.post(
  "/:id/complete",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));

    if (booking.tutorId !== actor.id && actor.role !== "admin") {
      throw forbidden("Only the tutor closes off a session.");
    }
    if (booking.status !== "confirmed") {
      throw new ApiError("Only a confirmed session can be completed.");
    }

    response.json(await db().bookings.updateOne({ id: booking.id }, { status: "completed" }));
  }),
);
