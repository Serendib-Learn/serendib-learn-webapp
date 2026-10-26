import { Router } from "express";
import { z } from "zod";
import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { notifyAdmins } from "../lib/accounts.ts";
import { logAudit } from "../lib/audit.ts";
import { availableCredits, grantCredit } from "../lib/credits.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAdmin, requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import { parseBody } from "../lib/validate.ts";
import type { MissedCause, StudentRequest } from "../../../shared/types.ts";

/**
 * Students asking the team for a free session, or for help with a lesson
 * that was missed. Only administrators (the super admin included) decide;
 * approving grants a free lesson (`lib/credits.ts`).
 */
export const requestsRouter = Router();

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

/** How long after a lesson a student can still report it missed. */
const MISSED_REPORT_DAYS = 30;

const causeLabel: Record<MissedCause, string> = {
  tutor_absent: "The tutor did not come",
  technical: "Technical problems (connection, link, audio)",
  student_unable: "I could not make it",
  other: "Something else",
};

const requestSchema = z.object({
  kind: z.enum(["free_session", "missed_session"], { error: "What are you asking for?" }),
  reason: z
    .string({ error: "Tell us a little about why." })
    .trim()
    .min(10, "Tell us a little about why — a sentence or two.")
    .max(2000, "Keep it under 2000 characters."),
  bookingId: z.string().optional(),
  cause: z.enum(["tutor_absent", "technical", "student_unable", "other"]).optional(),
});

/** Your own requests; every request (or one student's) for an administrator. */
requestsRouter.get(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const studentId = request.query.studentId ? String(request.query.studentId) : "";
    if (actor.role === "admin" && !studentId) {
      response.json(await db().studentRequests.find({}, { sort: newestFirst, limit: 300 }));
      return;
    }
    const whose = studentId || actor.id;
    requireSelfOrAdmin(request, whose);
    response.json(await db().studentRequests.find({ studentId: whose }, { sort: newestFirst }));
  }),
);

/** A student's free lessons: what is left to book, and what has been used. */
requestsRouter.get(
  "/credits",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const studentId = request.query.studentId ? String(request.query.studentId) : actor.id;
    requireSelfOrAdmin(request, studentId);
    const all = await db().lessonCredits.find({ studentId }, { sort: newestFirst });
    response.json({ available: (await availableCredits(studentId)).length, credits: all });
  }),
);

requestsRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    if (actor.role !== "student") throw forbidden("Requests are for students.");
    const input = parseBody(requestSchema, request.body ?? {});
    const mine = await db().studentRequests.find({ studentId: actor.id });

    let detail = "";
    if (input.kind === "free_session") {
      if (mine.some((item) => item.kind === "free_session" && item.status === "pending")) {
        throw new ApiError("You already have a free session request waiting. We will reply soon.", 409);
      }
    } else {
      if (!input.bookingId) throw new ApiError("Which lesson did you miss?");
      if (!input.cause) throw new ApiError("Tell us what happened.");
      const booking = await db().bookings.findById(input.bookingId);
      if (!booking || booking.studentId !== actor.id) throw new ApiError("That is not one of your lessons.");
      if (booking.status !== "confirmed" && booking.status !== "completed") {
        throw new ApiError("Only a lesson that was booked and paid for can be reported as missed.");
      }
      const started = new Date(booking.startsAt).getTime();
      if (started > Date.now()) throw new ApiError("That lesson has not happened yet — you can still move it.");
      if (Date.now() - started > MISSED_REPORT_DAYS * 86_400_000) {
        throw new ApiError(`Missed lessons can be reported up to ${MISSED_REPORT_DAYS} days afterwards.`);
      }
      if (mine.some((item) => item.bookingId === booking.id && item.status !== "declined")) {
        throw new ApiError("You have already asked about that lesson.", 409);
      }
      detail = `Lesson: ${new Date(booking.startsAt).toUTCString()}\nWhat happened: ${causeLabel[input.cause]}\n`;
    }

    const created: StudentRequest = await db().studentRequests.insertOne({
      id: newId("rq"),
      kind: input.kind,
      studentId: actor.id,
      bookingId: input.kind === "missed_session" ? input.bookingId : undefined,
      cause: input.kind === "missed_session" ? input.cause : undefined,
      reason: input.reason,
      status: "pending",
      createdAt: nowIso(),
    });

    await notifyAdmins(
      input.kind === "free_session"
        ? `Free session request from ${actor.name}`
        : `Missed lesson reported by ${actor.name}`,
      `${detail}${input.reason}\n\nApprove or decline: ${config.appUrl}/portal/admin?tab=requests`,
    );

    response.status(201).json(created);
  }),
);

const decisionSchema = z.object({
  note: z.string().trim().max(1000, "Keep the note under 1000 characters.").default(""),
});

async function loadPending(id: string): Promise<StudentRequest> {
  const item = await db().studentRequests.findById(id);
  if (!item) throw notFound("That request has gone.");
  if (item.status !== "pending") throw new ApiError("That request has already been decided.", 409);
  return item;
}

/** Approving grants the student a free lesson. Administrators only. */
requestsRouter.post(
  "/:id/approve",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const { note } = parseBody(decisionSchema, request.body ?? {});
    const item = await loadPending(pathParam(request, "id"));

    const credit = await grantCredit({
      studentId: item.studentId,
      reason: item.kind,
      grantedById: actor.id,
      requestId: item.id,
      note,
    });
    const updated = await db().studentRequests.updateOne(
      { id: item.id },
      {
        status: "approved",
        decidedById: actor.id,
        decidedAt: nowIso(),
        decisionNote: note || undefined,
        creditId: credit.id,
      },
    );

    const student = await db().users.findById(item.studentId);
    await logAudit(actor, "request_approved", student?.name ?? item.studentId, item.kind);
    response.json(updated);
  }),
);

requestsRouter.post(
  "/:id/decline",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const { note } = parseBody(decisionSchema, request.body ?? {});
    if (!note) throw new ApiError("Say why, in a line — the student gets this note.");
    const item = await loadPending(pathParam(request, "id"));

    const updated = await db().studentRequests.updateOne(
      { id: item.id },
      { status: "declined", decidedById: actor.id, decidedAt: nowIso(), decisionNote: note },
    );

    const student = await db().users.findById(item.studentId);
    if (student) {
      await deliver({
        to: student.email,
        subject:
          item.kind === "free_session"
            ? "About your free session request"
            : "About the lesson you reported missed",
        body: `${note}\n\nIf you would like to talk it through, just reply or email serendib.learn@gmail.com.`,
        kind: "notification",
      });
    }
    await logAudit(actor, "request_declined", student?.name ?? item.studentId, item.kind);
    response.json(updated);
  }),
);
