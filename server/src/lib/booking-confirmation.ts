import { db } from "../db/database.ts";
import { requireUserRecord } from "./domain.ts";
import { createGoogleMeeting } from "./google.ts";
import { nowIso } from "./ids.ts";
import { deliver } from "./mail.ts";
import type { Booking, User } from "../../../shared/types.ts";

/**
 * Real Meet link when the tutor has connected Google Calendar, otherwise the
 * same placeholder link the demo has always used. Either way a booking can
 * always be confirmed — Calendar is an enhancement, never a hard requirement.
 */
export async function scheduleMeeting(
  booking: Booking,
  tutor: User,
  student: User,
): Promise<{ meetingUrl: string; googleEventId?: string }> {
  const linked = await db().googleAccounts.findById(tutor.id);
  if (!linked) return { meetingUrl: `https://meet.serendiblearn.com/${booking.id}` };

  try {
    const startsAt = new Date(booking.startsAt);
    const endsAt = new Date(startsAt.getTime() + booking.durationMins * 60 * 1000);

    const meeting = await createGoogleMeeting({
      refreshToken: linked.refreshToken,
      summary: `Serendib Learn: ${tutor.name} × ${student.name}`,
      description: booking.focus,
      startIso: startsAt.toISOString(),
      endIso: endsAt.toISOString(),
      timezone: tutor.timezone,
      attendeeEmails: [tutor.email, student.email],
    });

    return { meetingUrl: meeting.meetLink, googleEventId: meeting.eventId };
  } catch (error) {
    // A stale/revoked refresh token or a transient API error should not stop
    // the booking from being confirmed.
    console.error("Google Calendar event creation failed:", error);
    return { meetingUrl: `https://meet.serendiblearn.com/${booking.id}` };
  }
}

function rupees(cents: number): string {
  return `Rs. ${(cents / 100).toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
}

/**
 * Marks a booking paid: meeting link, membership, receipt. Safe to call more
 * than once — a webhook retry and the browser's status check can both arrive
 * for the same payment, and only the first one does anything.
 */
export async function confirmBooking(
  booking: Booking,
  changes: Partial<Booking> = {},
): Promise<Booking> {
  const current = (await db().bookings.findById(booking.id)) ?? booking;
  if (current.status === "confirmed" || current.status === "completed") return current;

  const student = await requireUserRecord(current.studentId);
  const tutor = await requireUserRecord(current.tutorId);
  const meeting = await scheduleMeeting(current, tutor, student);

  const paid = await db().bookings.updateOne(
    { id: current.id },
    {
      ...changes,
      status: "confirmed",
      paidAt: nowIso(),
      meetingUrl: meeting.meetingUrl,
      googleEventId: meeting.googleEventId,
    },
  );

  if (student.membership === "none") {
    await db().users.updateOne({ id: student.id }, { membership: "active" });
  }

  const payment = paid?.payment ?? changes.payment;
  const amount = payment ? rupees(payment.amountCents) : `$${current.priceUsd}`;

  await deliver({
    to: student.email,
    subject: `Receipt — ${amount} for your session with ${tutor.name}`,
    body: `Payment received${payment?.card ? ` (${payment.card})` : ""}.\n\n${new Date(current.startsAt).toLocaleString()}\n${current.durationMins} minutes with ${tutor.name}\nFocus: ${current.focus}\n\nYour meeting link is in the portal.`,
    kind: "receipt",
  });

  await deliver({
    to: tutor.email,
    subject: `New booking: ${student.name}, ${new Date(current.startsAt).toLocaleString()}`,
    body: `${student.name} has booked and paid for ${current.durationMins} minutes.\nFocus: ${current.focus}\n\nThe meeting link is on the booking in your portal calendar.`,
    kind: "notification",
  });

  return paid ?? current;
}
