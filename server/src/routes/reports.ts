import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, wrap } from "../lib/errors.ts";
import { nowIso } from "../lib/ids.ts";
import { requireAdmin } from "../lib/sessions.ts";
import type {
  Booking,
  LessonPaidWith,
  StudentRequest,
  TutorHoursLesson,
  TutorHoursReport,
  TutorHoursSummary,
} from "../../../shared/types.ts";

/**
 * Reports for administrators only. The tutor hours report shows, for any
 * period, every lesson each tutor taught or has coming, how it was paid for,
 * and whether it is *verified* — taught, written up by the tutor and not
 * reported missed — which is what a tutor's pay should be worked out from.
 */
export const reportsRouter = Router();

/** A year and a bit: enough for any month, quarter or year. */
const MAX_RANGE_DAYS = 370;

function instant(value: unknown, label: string): Date {
  const date = new Date(String(value ?? ""));
  if (!value || Number.isNaN(date.getTime())) throw new ApiError(`Give the ${label} of the period.`);
  return date;
}

function paidWith(booking: Booking): LessonPaidWith {
  if (booking.creditId) return "free_lesson";
  if (!booking.paidAt) return "unpaid";
  return booking.payment ? "card" : "recorded";
}

reportsRouter.get(
  "/tutor-hours",
  requireAdmin,
  wrap(async (request, response) => {
    const from = instant(request.query.from, "start");
    const to = instant(request.query.to, "end");
    if (to <= from) throw new ApiError("The end of the period must come after its start.");
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) {
      throw new ApiError("Choose a period of a year or less.");
    }

    const inPeriod = await db().bookings.find({
      startsAt: { $gte: from.toISOString(), $lt: to.toISOString() },
    });
    // An unpaid booking never happened, and neither did one cancelled before
    // it was paid for (an abandoned checkout, say).
    const bookings = inPeriod.filter(
      (booking) => booking.status !== "awaiting_payment" && (booking.status !== "cancelled" || paidWith(booking) !== "unpaid"),
    );
    const ids = bookings.map((booking) => booking.id);

    const [notes, feedback, reports, tutors] = await Promise.all([
      db().lessonNotes.find({ bookingId: { $in: ids } }),
      db().feedback.find({ bookingId: { $in: ids } }),
      db().studentRequests.find({ kind: "missed_session", bookingId: { $in: ids } }),
      db().users.find({ role: "tutor" }),
    ]);
    const writtenUp = new Set(notes.map((note) => note.bookingId));
    const ratingFor = new Map(feedback.map((item) => [item.bookingId, item.rating]));
    const disputeFor = new Map<string, StudentRequest>();
    for (const report of reports) {
      if (report.status !== "declined" && report.cause !== "student_unable" && report.bookingId) {
        disputeFor.set(report.bookingId, report);
      }
    }

    const now = Date.now();
    const lessonFor = (booking: Booking): TutorHoursLesson => {
      const ends = new Date(booking.startsAt).getTime() + booking.durationMins * 60_000;
      const state = booking.status === "cancelled" ? "cancelled" : ends <= now ? "taught" : "upcoming";
      const dispute = disputeFor.get(booking.id);
      const done = booking.status === "completed" || writtenUp.has(booking.id);
      const paid = paidWith(booking);
      return {
        bookingId: booking.id,
        studentId: booking.studentId,
        startsAt: booking.startsAt,
        durationMins: booking.durationMins,
        language: booking.language,
        focus: booking.focus,
        state,
        paidWith: paid,
        amountCents: paid === "card" ? booking.payment?.amountCents : undefined,
        testPayment: paid === "card" && booking.payment?.mode === "test" ? true : undefined,
        writtenUp: done,
        rating: ratingFor.get(booking.id),
        dispute: dispute ? { status: dispute.status, cause: dispute.cause } : undefined,
        verified: state === "taught" && done && !dispute,
        cancelReason: booking.cancelReason,
      };
    };

    const names = new Map(tutors.map((tutor) => [tutor.id, tutor.name]));
    // Every tutor, plus anyone who taught in the period but is no longer a tutor.
    const tutorIds = [...new Set([...tutors.map((tutor) => tutor.id), ...bookings.map((b) => b.tutorId)])];
    const formerNames = await db().users.find({ id: { $in: tutorIds.filter((id) => !names.has(id)) } });
    for (const person of formerNames) names.set(person.id, person.name);

    const summaries = tutorIds.map((tutorId): TutorHoursSummary => {
      const lessons = bookings
        .filter((booking) => booking.tutorId === tutorId)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map(lessonFor);
      const taught = lessons.filter((lesson) => lesson.state === "taught");
      const upcoming = lessons.filter((lesson) => lesson.state === "upcoming");
      const held = [...taught, ...upcoming];
      const rated = lessons.filter((lesson) => lesson.rating !== undefined);
      const minutes = (list: TutorHoursLesson[]) => list.reduce((sum, lesson) => sum + lesson.durationMins, 0);
      return {
        tutorId,
        tutorName: names.get(tutorId) ?? "Former tutor",
        taughtLessons: taught.length,
        taughtMinutes: minutes(taught),
        verifiedMinutes: minutes(taught.filter((lesson) => lesson.verified)),
        awaitingWriteUp: taught.filter((lesson) => !lesson.writtenUp).length,
        disputed: lessons.filter((lesson) => lesson.dispute).length,
        upcomingLessons: upcoming.length,
        upcomingMinutes: minutes(upcoming),
        cancelledLessons: lessons.length - held.length,
        cardCents: held.reduce((sum, lesson) => sum + (lesson.amountCents ?? 0), 0),
        freeLessons: held.filter((lesson) => lesson.paidWith === "free_lesson").length,
        averageRating: rated.length
          ? Math.round((rated.reduce((sum, lesson) => sum + lesson.rating!, 0) / rated.length) * 10) / 10
          : undefined,
        ratings: rated.length,
        lessons,
      };
    });

    summaries.sort(
      (a, b) =>
        b.taughtMinutes - a.taughtMinutes ||
        b.upcomingMinutes - a.upcomingMinutes ||
        a.tutorName.localeCompare(b.tutorName, "en", { sensitivity: "base" }),
    );

    const report: TutorHoursReport = {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: nowIso(),
      tutors: summaries,
    };
    response.setHeader("Cache-Control", "no-store");
    response.json(report);
  }),
);
