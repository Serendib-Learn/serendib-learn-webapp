import { db } from "../db/database.ts";
import type { Booking } from "../../../shared/types.ts";

/** How long after a lesson its feedback is still asked for. */
export const FEEDBACK_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
/** The second reminder goes out this long after the lesson ends. */
export const SECOND_REMINDER_MS = 24 * 60 * 60 * 1000;

export function lessonEndsAt(booking: Booking): number {
  return new Date(booking.startsAt).getTime() + booking.durationMins * 60 * 1000;
}

/** A lesson that happened (or was meant to) and is recent enough to ask about. */
export function awaitsFeedback(booking: Booking, now = Date.now()): boolean {
  if (booking.status !== "confirmed" && booking.status !== "completed") return false;
  const ended = lessonEndsAt(booking);
  return ended <= now && now - ended <= FEEDBACK_WINDOW_MS;
}

export async function studentGaveFeedback(bookingId: string): Promise<boolean> {
  return (await db().feedback.count({ bookingId })) > 0;
}

export async function tutorWroteUp(bookingId: string): Promise<boolean> {
  return (await db().lessonNotes.count({ bookingId })) > 0;
}
