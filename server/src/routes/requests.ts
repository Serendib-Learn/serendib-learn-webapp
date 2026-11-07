import { Router } from "express";
import { z } from "zod";
import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { notifyAdmins } from "../lib/accounts.ts";
import { logAudit } from "../lib/audit.ts";
import { availableCredits, availablePrepaid, grantCredit, grantPrepaid, rupeesLkr } from "../lib/credits.ts";
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
    .min(10, "Tell us a little about why, in at least 10 characters.")
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

/** Every unused free lesson, for the team — newest first. Administrators only. */
requestsRouter.get(
  "/credits/held",
  requireAdmin,
  wrap(async (_request, response) => {
    const all = await db().lessonCredits.find({}, { sort: newestFirst });
    response.json(all.filter((credit) => !credit.usedBookingId && !credit.refundedAt));
  }),
);

/**
 * Records that an unused lesson was refunded to the student's card (the
 * refund policy, /refunds), so it can no longer be booked. The money itself
 * is returned in the Payments.lk dashboard first.
 */
requestsRouter.post(
  "/credits/:id/refunded",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const credit = await db().lessonCredits.findById(pathParam(request, "id"));
    if (!credit) throw notFound("That free lesson has gone.");
    if (credit.usedBookingId) throw new ApiError("That free lesson has already been booked.");
    if (credit.refundedAt) {
      response.json(credit);
      return;
    }
    const updated = await db().lessonCredits.updateOne(
      { id: credit.id },
      { refundedAt: nowIso(), refundedById: actor.id },
    );
    const student = await db().users.findById(credit.studentId);
    if (student) {
      const how =
        credit.reason === "prepaid"
          ? "We have refunded your unused prepaid lesson by bank transfer. It may take a few working days to reach your account."
          : "We have refunded your unused lesson to the card you paid with. Your bank may take 5 to 10 working days to show it.";
      await deliver({
        to: student.email,
        subject: "Your lesson has been refunded",
        body: `${how}\n\nThe lesson has been taken off your account, so it can no longer be booked. Thank you for learning with us. You are welcome back any time: ${config.appUrl}/portal/calendar`,
        kind: "notification",
      });
    }
    await logAudit(actor, "credit_refunded", student?.name ?? credit.studentId, credit.reason);
    response.json(updated);
  }),
);

/** The refund policy's window, counted from the payment. */
const REFUND_DAYS = 30;

/** "2026-11-01" is not after today, in the latest timezone (UTC+14). */
function notInFuture(day: string): boolean {
  const date = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day && date.getTime() <= Date.now() + 14 * 3600_000;
}

const prepaidSchema = z.object({
  studentId: z.string({ error: "Choose the student." }).trim().min(1, "Choose the student."),
  lessons: z
    .number({ error: "How many lessons did they pay for?" })
    .int("Lessons are whole hours.")
    .min(1, "Add at least one lesson.")
    .max(100, "That is more than 100 lessons. Add them in smaller payments."),
  amountLkr: z
    .number({ error: "How much did they pay, in rupees?" })
    .positive("How much did they pay, in rupees?")
    .max(10_000_000, "That amount looks too large."),
  paidOn: z
    .string({ error: "When did they pay?" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Give the payment date.")
    .refine(notInFuture, "The payment date cannot be in the future."),
  note: z.string().trim().max(500, "Keep the note under 500 characters.").default(""),
});

/**
 * Adds lessons a student paid for outside the site: by bank transfer, or
 * before the portal launched. Administrators only.
 */
requestsRouter.post(
  "/credits/prepaid",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const input = parseBody(prepaidSchema, request.body ?? {});
    const student = await db().users.findById(String(input.studentId));
    if (!student) throw notFound("No such student.");
    if (student.role !== "student") throw new ApiError("Prepaid lessons are for students.");

    const credits = await grantPrepaid({ ...input, studentId: student.id, grantedById: actor.id });
    await logAudit(
      actor,
      "prepaid_lessons_added",
      student.name,
      `${input.lessons} lessons, ${rupeesLkr(input.amountLkr)}, paid on ${input.paidOn}${input.note ? `: ${input.note}` : ""}`,
    );
    response.status(201).json(credits);
  }),
);

const refundSchema = z.object({
  message: z.string().trim().max(2000, "Keep it under 2000 characters.").default(""),
});

/**
 * A student asking for their unused prepaid lessons back. Nothing changes
 * here: the administrators are emailed, refund by bank transfer, then mark
 * each lesson refunded (the refund policy: within 30 days of the payment).
 */
requestsRouter.post(
  "/credits/refund",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    if (actor.role !== "student") throw forbidden("Refunds are for students.");
    const { message } = parseBody(refundSchema, request.body ?? {});
    const prepaid = await availablePrepaid(actor.id);
    if (prepaid.length === 0) {
      throw new ApiError(
        "You have no unused prepaid lessons. For a lesson you paid for by card, email serendib.learn@gmail.com.",
        409,
      );
    }

    const byDay = new Map<string, typeof prepaid>();
    for (const credit of prepaid) {
      const day = credit.paidOn ?? credit.createdAt.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), credit]);
    }
    const payments = [...byDay.entries()].map(([day, credits]) => {
      const days = Math.floor((Date.now() - new Date(`${day}T00:00:00Z`).getTime()) / 86_400_000);
      const total = credits.reduce((sum, credit) => sum + (credit.amountLkr ?? 0), 0);
      const window = days <= REFUND_DAYS ? `within the ${REFUND_DAYS}-day refund window` : `more than ${REFUND_DAYS} days ago, outside the refund window`;
      const notes = [...new Set(credits.map((credit) => credit.paymentNote).filter(Boolean))].join("; ");
      return `- ${credits.length} lesson${credits.length === 1 ? "" : "s"} paid on ${day} (${days} days ago, ${window}), worth ${rupeesLkr(total)}${notes ? `. Note: ${notes}` : ""}`;
    });
    const total = prepaid.reduce((sum, credit) => sum + (credit.amountLkr ?? 0), 0);

    await notifyAdmins(
      `Refund request from ${actor.name}`,
      `${actor.name} (${actor.email}) has asked for a refund of ${prepaid.length} unused prepaid lesson${prepaid.length === 1 ? "" : "s"}, worth ${rupeesLkr(total)}:\n${payments.join("\n")}\n\n${message ? `Their message:\n${message}\n\n` : ""}If you agree, refund them by bank transfer, then mark each lesson refunded: ${config.appUrl}/portal/admin?tab=requests`,
    );
    response.status(202).json({ lessons: prepaid.length, amountLkr: total });
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
      if (started > Date.now()) throw new ApiError("That lesson has not happened yet. You can still move it.");
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
    if (!note) throw new ApiError("Say why, in a line. The student gets this note.");
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
