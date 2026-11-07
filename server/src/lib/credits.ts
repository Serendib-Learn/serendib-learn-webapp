import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { newId, nowIso } from "./ids.ts";
import { deliver } from "./mail.ts";
import type { Booking, CreditReason, LessonCredit } from "../../../shared/types.ts";

/** A free lesson covers one ordinary lesson: an hour. */
export const CREDIT_MINUTES = 60;

const oldestFirst = (a: LessonCredit, b: LessonCredit) => a.createdAt.localeCompare(b.createdAt);

/** Unused credits, oldest first — the order they are spent in. Refunded ones are gone. */
export async function availableCredits(studentId: string): Promise<LessonCredit[]> {
  const all = await db().lessonCredits.find({ studentId }, { sort: oldestFirst });
  return all.filter((credit) => !credit.usedBookingId && !credit.refundedAt);
}

const why: Record<CreditReason, string> = {
  free_session: "Your request for a free session was approved.",
  missed_session: "We have looked into your missed lesson and added a make-up lesson for you.",
  tutor_cancelled: "Your tutor had to cancel a lesson you had paid for, so you have a free lesson to book instead.",
  student_cancelled: "You cancelled a paid lesson in good time, so you keep it: book it again whenever suits you. If you would rather have your money back, reply within 30 days of paying and we will refund it to your card.",
  prepaid: "You have a lesson you paid for in advance.",
};

/** Rupees with thousands separators: "Rs 20,000". */
export const rupeesLkr = (amount: number) => `Rs ${amount.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;

/** Unused prepaid lessons, oldest first. */
export async function availablePrepaid(studentId: string): Promise<LessonCredit[]> {
  return (await availableCredits(studentId)).filter((credit) => credit.reason === "prepaid");
}

/**
 * Lessons a student paid for outside the site, by bank transfer or before
 * the portal launched. Each is an ordinary one-hour credit holding its share
 * of the payment, so it is booked, cancelled and refunded like any other.
 * They do not expire. The student gets one email for the whole payment.
 */
export async function grantPrepaid(input: {
  studentId: string;
  lessons: number;
  amountLkr: number;
  paidOn: string;
  note?: string;
  grantedById: string;
}): Promise<LessonCredit[]> {
  const share = Math.round((input.amountLkr / input.lessons) * 100) / 100;
  const createdAt = nowIso();
  const credits: LessonCredit[] = [];
  for (let index = 0; index < input.lessons; index += 1) {
    credits.push(
      await db().lessonCredits.insertOne({
        id: newId("cr"),
        studentId: input.studentId,
        reason: "prepaid",
        durationMins: CREDIT_MINUTES,
        grantedById: input.grantedById,
        createdAt,
        paidOn: input.paidOn,
        amountLkr: share,
        paymentNote: input.note || undefined,
      }),
    );
  }

  const student = await db().users.findById(input.studentId);
  if (student) {
    const lessons = `${input.lessons} prepaid lesson${input.lessons === 1 ? "" : "s"}`;
    await deliver({
      to: student.email,
      subject: `Your ${lessons} ${input.lessons === 1 ? "is" : "are"} ready to book`,
      body: `Thank you for your payment of ${rupeesLkr(input.amountLkr)}. We have added ${lessons} to your account, one hour each with any tutor. They do not expire.\n\nPick any open hour in your calendar and choose "Book with a prepaid lesson". There is nothing more to pay: ${config.appUrl}/portal/calendar\n\nIf you would like a refund of lessons you have not used, use "Ask for a refund" on the same page.`,
      kind: "notification",
    });
  }
  return credits;
}

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
      body: `${why[input.reason]}${input.note ? `\n\n${input.note}` : ""}\n\nPick any open hour in your calendar and choose "Book with a free lesson". No payment needed: ${config.appUrl}/portal/calendar`,
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
