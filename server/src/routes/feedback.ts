import { Router } from "express";
import { z } from "zod";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import {
  awaitsFeedback,
  lessonEndsAt,
  studentGaveFeedback,
  tutorWroteUp,
} from "../lib/feedback.ts";
import { pathParam } from "../lib/http.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import { parseBody } from "../lib/validate.ts";
import type {
  Booking,
  LessonNote,
  PendingFeedback,
  SessionFeedback,
  User,
  VoiceNoteInfo,
} from "../../../shared/types.ts";

export const feedbackRouter = Router();
export const voiceNotesRouter = Router();

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

async function loadBooking(id: string): Promise<Booking> {
  const booking = await db().bookings.findById(id);
  if (!booking) throw notFound("That booking has gone.");
  return booking;
}

function isParty(booking: Booking, user: User): boolean {
  return booking.studentId === user.id || booking.tutorId === user.id;
}

/** A voice note attached to feedback must be the author's own, for the same lesson. */
async function checkVoiceNote(id: string | undefined, owner: User, bookingId: string) {
  if (!id) return;
  const note = await db().voiceNotes.findById(id);
  if (!note || note.ownerId !== owner.id || note.bookingId !== bookingId) {
    throw new ApiError("That voice note is not yours to attach here.");
  }
}

/** Finished lessons still waiting on the signed-in person's part. */
feedbackRouter.get(
  "/pending",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const asStudent = await db().bookings.find({ studentId: actor.id });
    const asTutor = await db().bookings.find({ tutorId: actor.id });

    const pending: PendingFeedback[] = [];
    for (const booking of [...asStudent, ...asTutor].filter((item) => awaitsFeedback(item))) {
      const isStudent = booking.studentId === actor.id;
      const done = isStudent
        ? await studentGaveFeedback(booking.id)
        : await tutorWroteUp(booking.id);
      if (done) continue;

      const other = await db().users.findById(isStudent ? booking.tutorId : booking.studentId);
      if (!other) continue;
      pending.push({
        booking,
        other: { id: other.id, name: other.name, role: other.role, avatarId: other.avatarId },
        kind: isStudent ? "feedback" : "write-up",
      });
    }

    pending.sort((a, b) => lessonEndsAt(b.booking) - lessonEndsAt(a.booking));
    response.json(pending);
  }),
);

const feedbackSchema = z.object({
  bookingId: z.string({ error: "Which lesson?" }).min(1, "Which lesson?"),
  rating: z.coerce
    .number({ error: "Give the lesson a rating from 1 to 5." })
    .int()
    .min(1, "Give the lesson a rating from 1 to 5.")
    .max(5, "Give the lesson a rating from 1 to 5."),
  comment: z.string().trim().max(2000, "Keep it under 2000 characters.").default(""),
  voiceNoteId: z.string().optional(),
  pace: z.enum(["too_slow", "just_right", "too_fast"]).optional(),
  materialsRating: z.coerce.number().int().min(1).max(5).optional(),
  nextFocus: z.string().trim().max(500, "Keep it under 500 characters.").optional(),
});

const paceLabel = { too_slow: "too slow", just_right: "about right", too_fast: "too fast" } as const;
const progressLabel = { needs_support: "needs a bit more support", on_track: "on track", ahead: "ahead of where we expected" } as const;

/** The student's feedback on one lesson. Once per lesson. */
feedbackRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const input = parseBody(feedbackSchema, request.body);
    const booking = await loadBooking(input.bookingId);

    if (booking.studentId !== actor.id) throw forbidden("Only the student gives feedback on a lesson.");
    if (!awaitsFeedback(booking)) throw new ApiError("Feedback opens once the lesson has finished.");
    if (await studentGaveFeedback(booking.id)) throw new ApiError("You have already given feedback on this lesson.", 409);
    await checkVoiceNote(input.voiceNoteId, actor, booking.id);

    const feedback: SessionFeedback = {
      id: newId("fb"),
      bookingId: booking.id,
      studentId: actor.id,
      tutorId: booking.tutorId,
      rating: input.rating,
      comment: input.comment,
      voiceNoteId: input.voiceNoteId,
      pace: input.pace,
      materialsRating: input.materialsRating,
      nextFocus: input.nextFocus || undefined,
      createdAt: nowIso(),
    };
    const created = await db().feedback.insertOne(feedback);
    const extras = [
      input.pace ? `Pace: ${paceLabel[input.pace]}` : "",
      input.materialsRating ? `Materials: ${input.materialsRating}/5` : "",
      input.nextFocus ? `Next time: ${input.nextFocus}` : "",
    ].filter(Boolean);

    const tutor = await db().users.findById(booking.tutorId);
    if (tutor) {
      await deliver({
        to: tutor.email,
        subject: `${actor.name} rated your lesson ${"★".repeat(input.rating)}${"☆".repeat(5 - input.rating)}`,
        body: `${input.comment || "(No written comment.)"}${extras.length ? `\n\n${extras.join("\n")}` : ""}${input.voiceNoteId ? "\n\nThey also left a voice note — listen in your portal." : ""}`,
        kind: "notification",
      });
    }

    response.status(201).json(created);
  }),
);

/** Feedback for a tutor (their own, or any tutor's for an admin), or all of it for an admin. */
feedbackRouter.get(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const tutorId = request.query.tutorId ? String(request.query.tutorId) : "";
    const studentId = request.query.studentId ? String(request.query.studentId) : "";

    if (tutorId) {
      requireSelfOrAdmin(request, tutorId);
      response.json(await db().feedback.find({ tutorId }, { sort: newestFirst }));
    } else if (studentId) {
      requireSelfOrAdmin(request, studentId);
      response.json(await db().feedback.find({ studentId }, { sort: newestFirst }));
    } else {
      if (actor.role !== "admin") throw forbidden("Administrators only.");
      response.json(await db().feedback.find({}, { sort: newestFirst, limit: 200 }));
    }
  }),
);

const lessonNoteSchema = z.object({
  bookingId: z.string({ error: "Which lesson?" }).min(1, "Which lesson?"),
  summary: z
    .string({ error: "Say briefly what the lesson covered." })
    .trim()
    .min(1, "Say briefly what the lesson covered.")
    .max(2000),
  wentWell: z.string().trim().max(1000).default(""),
  workOn: z.string().trim().max(1000).default(""),
  vocabIntroduced: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  voiceNoteId: z.string().optional(),
  progress: z.enum(["needs_support", "on_track", "ahead"]).optional(),
  engagement: z.coerce.number().int().min(1).max(5).optional(),
  materialIds: z.array(z.string().min(1)).max(20).default([]),
});

/** The tutor's write-up after a lesson. Once per lesson. */
feedbackRouter.post(
  "/lesson-notes",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const input = parseBody(lessonNoteSchema, request.body);
    const booking = await loadBooking(input.bookingId);

    if (booking.tutorId !== actor.id) throw forbidden("Only the tutor writes up a lesson.");
    if (!awaitsFeedback(booking)) throw new ApiError("Write-ups open once the lesson has finished.");
    if (await tutorWroteUp(booking.id)) throw new ApiError("This lesson already has a write-up.", 409);
    await checkVoiceNote(input.voiceNoteId, actor, booking.id);

    // Materials used in the lesson: the tutor's own (now assigned to this
    // student, if they were not already) or the open library.
    const materialIds = Array.from(new Set(input.materialIds));
    for (const id of materialIds) {
      const material = await db().materials.findById(id);
      const usable = material && (material.ownerId === actor.id || material.assignedTo.length === 0);
      if (!usable) throw new ApiError("One of those materials is not yours to share.");
      if (material.ownerId === actor.id && material.assignedTo.length > 0 && !material.assignedTo.includes(booking.studentId)) {
        await db().materials.updateOne(
          { id: material.id },
          { assignedTo: [...material.assignedTo, booking.studentId] },
        );
      }
    }

    const note: LessonNote = {
      id: newId("ln"),
      bookingId: booking.id,
      studentId: booking.studentId,
      tutorId: actor.id,
      date: booking.startsAt,
      summary: input.summary,
      wentWell: input.wentWell,
      workOn: input.workOn,
      vocabIntroduced: input.vocabIntroduced,
      voiceNoteId: input.voiceNoteId,
      progress: input.progress,
      engagement: input.engagement,
      materialIds: materialIds.length ? materialIds : undefined,
      createdAt: nowIso(),
    };
    const created = await db().lessonNotes.insertOne(note);

    // Writing it up is what closes off a lesson that is still marked confirmed.
    if (booking.status === "confirmed") {
      await db().bookings.updateOne({ id: booking.id }, { status: "completed" });
    }

    const student = await db().users.findById(booking.studentId);
    if (student) {
      await deliver({
        to: student.email,
        subject: `${actor.name} wrote up your lesson`,
        body: `${input.summary}${input.progress ? `\n\nWhere you are: ${progressLabel[input.progress]}.` : ""}${input.workOn ? `\n\nTo work on: ${input.workOn}` : ""}${materialIds.length ? `\n\n${materialIds.length} material${materialIds.length === 1 ? "" : "s"} from the lesson ${materialIds.length === 1 ? "is" : "are"} in your learning hub.` : ""}\n\nThe full write-up${input.voiceNoteId ? ", with a voice note," : ""} is in your learning hub.`,
        kind: "notification",
      });
    }

    response.status(201).json(created);
  }),
);

/** ~3 MB of audio once base64 is decoded: minutes of speech at voice bitrates. */
const MAX_VOICE_BASE64 = 4 * 1024 * 1024;
const MAX_VOICE_SECONDS = 180;

const voiceNoteSchema = z.object({
  bookingId: z.string({ error: "Which lesson?" }).min(1, "Which lesson?"),
  mimeType: z
    .string()
    .trim()
    .regex(/^audio\/[a-z0-9.+-]+(;\s*codecs=[a-z0-9.,"' +-]+)?$/i, "That is not an audio recording."),
  durationSec: z.coerce.number().min(0).max(MAX_VOICE_SECONDS, "Keep voice notes under three minutes."),
  data: z
    .string({ error: "The recording did not come through." })
    .min(1, "The recording did not come through.")
    .max(MAX_VOICE_BASE64, "That recording is too long. Keep it under three minutes.")
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "The recording did not come through."),
});

/**
 * Uploads a voice note for a lesson, before the feedback or write-up that
 * refers to it. Mounted with its own larger body limit in index.ts.
 */
voiceNotesRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const input = parseBody(voiceNoteSchema, request.body);
    const booking = await loadBooking(input.bookingId);
    if (!isParty(booking, actor)) throw forbidden("That lesson is not yours.");

    const note = await db().voiceNotes.insertOne({
      id: newId("vn"),
      ownerId: actor.id,
      bookingId: booking.id,
      mimeType: input.mimeType,
      durationSec: Math.round(input.durationSec),
      data: input.data,
      createdAt: nowIso(),
    });

    const info: VoiceNoteInfo = {
      id: note.id,
      ownerId: note.ownerId,
      bookingId: note.bookingId,
      mimeType: note.mimeType,
      durationSec: note.durationSec,
      createdAt: note.createdAt,
    };
    response.status(201).json(info);
  }),
);

/** The audio itself, for the two people on the lesson and administrators. */
voiceNotesRouter.get(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const note = await db().voiceNotes.findById(pathParam(request, "id"));
    if (!note) throw notFound("That voice note has gone.");

    const booking = await db().bookings.findById(note.bookingId);
    if (actor.role !== "admin" && !(booking && isParty(booking, actor))) {
      throw forbidden("That voice note is not yours to hear.");
    }

    response.setHeader("Content-Type", note.mimeType.split(";")[0]);
    response.setHeader("Cache-Control", "private, max-age=3600");
    response.send(Buffer.from(note.data, "base64"));
  }),
);
