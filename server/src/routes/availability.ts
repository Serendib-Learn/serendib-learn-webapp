import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { minutesFromMidnight, openSlotsFor, overlaps } from "../lib/domain.ts";
import { newId } from "../lib/ids.ts";
import { requireAuth, requireUser } from "../lib/sessions.ts";
import type { AvailabilityRule } from "../../../shared/types.ts";

export const availabilityRouter = Router();

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

availabilityRouter.get(
  "/",
  wrap(async (request, response) => {
    const tutorId = String(request.query.tutorId ?? "");
    if (!tutorId) throw new ApiError("Which tutor?");

    response.json(
      await db().availability.find(
        { tutorId },
        { sort: (a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start) },
      ),
    );
  }),
);

availabilityRouter.get(
  "/slots",
  wrap(async (request, response) => {
    const tutorId = String(request.query.tutorId ?? "");
    if (!tutorId) throw new ApiError("Which tutor?");

    const days = Math.min(Math.max(Number(request.query.days ?? 14), 1), 60);
    response.json(await openSlotsFor(tutorId, days));
  }),
);

availabilityRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const tutorId = String(request.body?.tutorId ?? actor.id);
    const start = String(request.body?.start ?? "");
    const end = String(request.body?.end ?? "");
    const weekday = Number(request.body?.weekday);

    if (actor.id !== tutorId && actor.role !== "admin") {
      throw forbidden("You can only publish your own hours.");
    }
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new ApiError("Pick a day of the week.");
    }
    if (!CLOCK.test(start) || !CLOCK.test(end)) {
      throw new ApiError("Times need to look like 18:00.");
    }
    if (minutesFromMidnight(end) <= minutesFromMidnight(start)) {
      throw new ApiError("The end time has to be after the start time.");
    }

    const existing = await db().availability.find({ tutorId, weekday });
    const clash = existing.some((rule) =>
      overlaps(
        minutesFromMidnight(start),
        minutesFromMidnight(end),
        minutesFromMidnight(rule.start),
        minutesFromMidnight(rule.end),
      ),
    );
    if (clash) throw new ApiError("That overlaps a block you already have on this day.");

    const rule: AvailabilityRule = { id: newId("av"), tutorId, weekday, start, end };
    response.status(201).json(await db().availability.insertOne(rule));
  }),
);

availabilityRouter.delete(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const rule = await db().availability.findById(pathParam(request, "id"));
    if (!rule) throw notFound("That block has gone already.");

    if (rule.tutorId !== actor.id && actor.role !== "admin") {
      throw forbidden("That block belongs to another tutor.");
    }

    await db().availability.deleteOne({ id: rule.id });
    response.status(204).end();
  }),
);
