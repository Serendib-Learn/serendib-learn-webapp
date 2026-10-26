import { Router } from "express";
import { config } from "../config.ts";
import { db, SYSTEM_CALENDAR_ID } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { blocksSlot, isBookableTutor, openSlotsFor, overlaps, priceFor, requireUserRecord } from "../lib/domain.ts";
import { confirmBooking } from "../lib/booking-confirmation.ts";
import { availableCredits, grantCredit, releaseCredit, spendCredit } from "../lib/credits.ts";
import { deleteGoogleMeeting, moveGoogleMeeting } from "../lib/google.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { checkoutFor, paymentsEnabled } from "../lib/payments.ts";
import { requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import { syncBookingPayment } from "./payments.ts";
import type { Booking, LanguageCode, User } from "../../../shared/types.ts";

export const bookingsRouter = Router();

const byStart = (a: Booking, b: Booking) => a.startsAt.localeCompare(b.startsAt);

/**
 * How long before a lesson a student can still move it themselves. Tutors and
 * administrators can move a lesson any time before it starts; a student who
 * is later than this asks the team through a help request.
 */
export const STUDENT_RESCHEDULE_NOTICE_HOURS = 24;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }) + " (UTC)";

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

    const student = await requireUserRecord(studentId);
    if (student.role !== "student") {
      throw forbidden("Lessons are booked for students. Use a student account to book one.");
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

/**
 * Confirms a booking with one of the student's free lessons instead of a
 * payment. The booking must be waiting for payment and fit in a credit.
 */
bookingsRouter.post(
  "/:id/use-credit",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));
    if (booking.studentId !== actor.id && actor.role !== "admin") {
      throw forbidden("Only the student books with their free lessons.");
    }
    if (booking.status !== "awaiting_payment") {
      throw new ApiError("That booking is not waiting for payment.");
    }

    const credit = (await availableCredits(booking.studentId)).find(
      (item) => item.durationMins >= booking.durationMins,
    );
    if (!credit) throw new ApiError("You have no free lessons to use.", 409, "no_credit");

    await spendCredit(credit, booking);
    response.json(await confirmBooking(booking, { creditId: credit.id }));
  }),
);

/**
 * Moves a lesson to another time, for free: the price, the payment (or free
 * lesson) and the Meet link all stay with it. The student needs
 * STUDENT_RESCHEDULE_NOTICE_HOURS' notice and one of the tutor's open hours;
 * the tutor and administrators can move it to any free time before it starts.
 */
bookingsRouter.post(
  "/:id/reschedule",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));
    assertParty(booking, actor);

    if (booking.status !== "confirmed" && booking.status !== "awaiting_payment") {
      throw new ApiError("Only an upcoming lesson can be moved.");
    }
    const oldStart = new Date(booking.startsAt).getTime();
    if (oldStart <= Date.now()) throw new ApiError("That lesson has already started.");

    const isStudent = actor.id === booking.studentId && actor.role !== "admin";
    if (isStudent && oldStart - Date.now() < STUDENT_RESCHEDULE_NOTICE_HOURS * 3600_000) {
      throw new ApiError(
        `Lessons can be moved up to ${STUDENT_RESCHEDULE_NOTICE_HOURS} hours before they start. For anything later, send us a help request from your calendar.`,
        409,
        "too_late",
      );
    }

    const startMs = new Date(String(request.body?.startsAt ?? "")).getTime();
    if (Number.isNaN(startMs)) throw new ApiError("Pick a new time.");
    if (startMs === oldStart) throw new ApiError("That is the time it is already booked for.");
    if (startMs < Date.now()) throw new ApiError("That time is in the past.");
    const endMs = startMs + booking.durationMins * 60_000;

    if (isStudent) {
      const open = await openSlotsFor(booking.tutorId, 60);
      if (!open.some((slot) => new Date(slot.startsAt).getTime() === startMs)) {
        throw new ApiError("Pick one of your tutor's open hours.");
      }
    }

    const clashes = (others: Booking[]) =>
      others
        .filter((other) => other.id !== booking.id && blocksSlot(other))
        .some((other) => {
          const start = new Date(other.startsAt).getTime();
          return overlaps(startMs, endMs, start, start + other.durationMins * 60_000);
        });
    if (clashes(await db().bookings.find({ tutorId: booking.tutorId }))) {
      throw new ApiError("The tutor is already teaching then. Pick another time.");
    }
    if (clashes(await db().bookings.find({ studentId: booking.studentId }))) {
      throw new ApiError("The student already has a lesson then. Pick another time.");
    }

    const newStartIso = new Date(startMs).toISOString();
    const updated = await db().bookings.updateOne(
      { id: booking.id },
      {
        startsAt: newStartIso,
        // The day-ahead and hour-ahead reminders go out again for the new time.
        lessonReminders: undefined,
        reschedules: [
          ...(booking.reschedules ?? []),
          { from: booking.startsAt, to: newStartIso, byId: actor.id, at: nowIso() },
        ],
      },
    );
    if (!updated) throw notFound("That booking has gone.");

    const tutor = await requireUserRecord(booking.tutorId);
    const student = await requireUserRecord(booking.studentId);
    if (booking.googleEventId) {
      const calendar = booking.googleCalendarOwner === "system" ? SYSTEM_CALENDAR_ID : booking.tutorId;
      const linked = await db().googleAccounts.findById(calendar);
      if (linked) {
        await moveGoogleMeeting(linked.refreshToken, booking.googleEventId, {
          startIso: newStartIso,
          endIso: new Date(endMs).toISOString(),
          timezone: tutor.timezone,
        });
      }
    }

    const mover = actor.id === tutor.id ? tutor.name : actor.id === student.id ? student.name : "The Serendib team";
    for (const person of [student, tutor]) {
      await deliver({
        to: person.email,
        subject: `Lesson moved to ${when(newStartIso)}`,
        body: `${mover} moved the lesson between ${student.name} and ${tutor.name}.\n\nWas: ${when(booking.startsAt)}\nNow: ${when(newStartIso)}\n\nNothing changes about the price${updated.meetingUrl ? ` or the meeting link: ${updated.meetingUrl}` : "."}\n\nYour calendar: ${config.appUrl}/portal/calendar`,
        kind: "notification",
      });
    }

    response.json(updated);
  }),
);

bookingsRouter.post(
  "/:id/cancel",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));
    assertParty(booking, actor);

    if (booking.status === "completed") {
      throw new ApiError("That session already happened.");
    }
    if (booking.status === "cancelled") {
      response.json(booking);
      return;
    }

    if (booking.googleEventId) {
      const calendar =
        booking.googleCalendarOwner === "system" ? SYSTEM_CALENDAR_ID : booking.tutorId;
      const linked = await db().googleAccounts.findById(calendar);
      if (linked) await deleteGoogleMeeting(linked.refreshToken, booking.googleEventId);
    }

    const cancelled = await db().bookings.updateOne({ id: booking.id }, { status: "cancelled" });

    // A free lesson comes back. A lesson the student paid for, cancelled by
    // the tutor or the team rather than the student, becomes a free one.
    const byStudent = actor.id === booking.studentId;
    if (booking.creditId) {
      await releaseCredit(booking);
    } else if (booking.status === "confirmed" && booking.paidAt && !byStudent) {
      await grantCredit({
        studentId: booking.studentId,
        reason: "tutor_cancelled",
        grantedById: actor.id,
        sourceBookingId: booking.id,
      });
    }

    const otherId = byStudent ? booking.tutorId : booking.studentId;
    const other = await db().users.findById(otherId);
    if (other && booking.status === "confirmed") {
      await deliver({
        to: other.email,
        subject: `Lesson cancelled: ${when(booking.startsAt)}`,
        body: `${actor.name} cancelled the lesson on ${when(booking.startsAt)}.\n\nYour calendar: ${config.appUrl}/portal/calendar`,
        kind: "notification",
      });
    }

    response.json(cancelled);
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
        body: `The link for your lesson on ${new Date(booking.startsAt).toLocaleString()}:\n\n${url.toString()}\n\nIt is also on the booking in your calendar: ${config.appUrl}/portal/calendar`,
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
