import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { blocksSlot, overlaps, priceFor, requireUserRecord } from "../lib/domain.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
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

bookingsRouter.post(
  "/:id/pay",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const booking = await load(pathParam(request, "id"));
    assertParty(booking, actor);

    if (booking.status === "confirmed") {
      response.json(booking);
      return;
    }
    if (booking.status !== "awaiting_payment") {
      throw new ApiError("That booking is not waiting for payment.");
    }

    // A real integration would create a payment intent and confirm it here.
    const paid = await db().bookings.updateOne(
      { id: booking.id },
      {
        status: "confirmed",
        paidAt: nowIso(),
        meetingUrl: `https://meet.serendiblearn.com/${booking.id}`,
      },
    );

    const student = await requireUserRecord(booking.studentId);
    const tutor = await requireUserRecord(booking.tutorId);

    if (student.membership === "none") {
      await db().users.updateOne({ id: student.id }, { membership: "active" });
    }

    await deliver({
      to: student.email,
      subject: `Receipt — $${booking.priceUsd} for your session with ${tutor.name}`,
      body: `Payment received.\n\n${new Date(booking.startsAt).toLocaleString()}\n${booking.durationMins} minutes with ${tutor.name}\nFocus: ${booking.focus}\n\nYour meeting link is in the portal.`,
      kind: "receipt",
    });

    response.json(paid);
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

    response.json(await db().bookings.updateOne({ id: booking.id }, { status: "cancelled" }));
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
