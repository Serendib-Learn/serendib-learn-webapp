import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { newId, nowIso } from "./ids.ts";
import { deliver } from "./mail.ts";
import type { Booking, CreditReason, LessonCredit } from "../../../shared/types.ts";

/** A free lesson covers one ordinary lesson: an hour. */
export const CREDIT_MINUTES = 60;

const oldestFirst = (a: LessonCredit, b: LessonCredit) => a.createdAt.localeCompare(b.createdAt);

/** Unused credits, oldest first — the order they are spent in. */
export async function availableCredits(studentId: string): Promise<LessonCredit[]> {
  const all = await db().lessonCredits.find({ studentId }, { sort: oldestFirst });
  return all.filter((credit) => !credit.usedBookingId);
}

const why: Record<CreditReason, string> = {
  free_session: "Your request for a free session was approved.",
  missed_session: "We have looked into your missed lesson and added a make-up lesson for you.",
  tutor_cancelled: "Your tutor had to cancel a lesson you had paid for, so you have a free lesson to book instead.",
};

/** Gives a student one free lesson and tells them how to use it. */
export async function grantCredit(input: {
  studentId: string;
  reason: CreditReason;
  grantedById: string;
  requestId?: string;
  sourceBookingId?: string;
  note?: string;
}): Promise<LessonCredit> {
  const credit = await db().lessonCredits.insertOne({
    id: newId("cr"),
    studentId: input.studentId,
    reason: input.reason,
    durationMins: CREDIT_MINUTES,
    requestId: input.requestId,
    sourceBookingId: input.sourceBookingId,
    grantedById: input.grantedById,
    createdAt: nowIso(),
  });

  const student = await db().users.findById(input.studentId);
  if (student) {
    await deliver({
      to: student.email,
      subject: "You have a free lesson to book",
      body: `${why[input.reason]}${input.note ? `\n\n${input.note}` : ""}\n\nPick any open hour in your calendar and choose "Book with a free lesson" — no payment needed: ${config.appUrl}/portal/calendar`,
      kind: "notification",
    });
  }
  return credit;
}

/** Marks a credit spent on a booking. */
export async function spendCredit(credit: LessonCredit, booking: Booking): Promise<void> {
  await db().lessonCredits.updateOne(
    { id: credit.id },
    { usedBookingId: booking.id, usedAt: nowIso() },
  );
}

/** Gives back the credit a cancelled booking was made with, if any. */
export async function releaseCredit(booking: Booking): Promise<void> {
  if (!booking.creditId) return;
  await db().lessonCredits.updateOne(
    { id: booking.creditId },
    { usedBookingId: undefined, usedAt: undefined },
  );
}
