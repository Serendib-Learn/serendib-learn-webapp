import { config } from "../config.ts";
import { db, SYSTEM_CALENDAR_ID } from "../db/database.ts";
import { requireUserRecord } from "./domain.ts";
import { createGoogleMeeting } from "./google.ts";
import { nowIso } from "./ids.ts";
import { deliver } from "./mail.ts";
import { formatInZone, validTimezone } from "./time.ts";
import type { Booking, User } from "../../../shared/types.ts";

export interface ScheduledMeeting {
  meetingUrl?: string;
  googleEventId?: string;
  googleCalendarOwner?: "tutor" | "system";
}

/**
 * A real Google Meet link for the booking: from the tutor's own calendar when
 * they have connected one, otherwise from the site's shared Serendib calendar
 * when an admin has connected that. Both people are invited, so Google emails
 * them the event. With neither connected there is no link yet — never a
 * made-up one — and the tutor or an admin adds one to the booking by hand.
 * Calendar is an enhancement: a booking always confirms.
 */
export async function scheduleMeeting(
  booking: Booking,
  tutor: User,
  student: User,
): Promise<ScheduledMeeting> {
  const calendars = [
    { owner: "tutor" as const, account: await db().googleAccounts.findById(tutor.id) },
    { owner: "system" as const, account: await db().googleAccounts.findById(SYSTEM_CALENDAR_ID) },
  ];

  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(startsAt.getTime() + booking.durationMins * 60 * 1000);

  for (const { owner, account } of calendars) {
    if (!account) continue;
    try {
      const meeting = await createGoogleMeeting({
        refreshToken: account.refreshToken,
        summary: `Serendib Learn: ${tutor.name} × ${student.name}`,
        description: `${booking.focus}\n\nBooked through Serendib Learn — your lessons, materials and messages: ${config.appUrl}/portal/calendar`,
        startIso: startsAt.toISOString(),
        endIso: endsAt.toISOString(),
        timezone: validTimezone(tutor.timezone),
        attendeeEmails: [tutor.email, student.email],
      });
      return { meetingUrl: meeting.meetLink, googleEventId: meeting.eventId, googleCalendarOwner: owner };
    } catch (error) {
      // A revoked token or a transient API error: try the next calendar.
      console.error(`Google Calendar event creation failed (${owner} calendar):`, error);
    }
  }

  return {};
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
      ...meeting,
    },
  );

  if (student.membership === "none") {
    await db().users.updateOne({ id: student.id }, { membership: "active" });
  }

  const payment = paid?.payment ?? changes.payment;
  const amount = rupees(payment ? payment.amountCents : current.priceLkr * 100);
  const free = Boolean(paid?.creditId ?? changes.creditId);

  await deliver({
    to: student.email,
    subject: free
      ? `Booked — your free lesson with ${tutor.name}`
      : `Receipt — ${amount} for your session with ${tutor.name}`,
    body: `${free ? "Booked with your free lesson — nothing to pay" : `Payment received${payment?.card ? ` (${payment.card})` : ""}`}.\n\n${formatInZone(current.startsAt, student.timezone)}\n${current.durationMins} minutes with ${tutor.name}\nFocus: ${current.focus}\n\n${meeting.meetingUrl ? `Join on Google Meet: ${meeting.meetingUrl}\n\nGoogle has also sent you a calendar invitation, and the link is on the booking in your calendar: ${config.appUrl}/portal/calendar` : `Your tutor will add the meeting link to the booking in your calendar before the lesson: ${config.appUrl}/portal/calendar`}\n\nWe will remind you a day before and an hour before.`,
    kind: "receipt",
  });

  await deliver({
    to: tutor.email,
    subject: `New booking: ${student.name}, ${formatInZone(current.startsAt, tutor.timezone)}`,
    body: `${student.name} has booked ${free ? "a free lesson (granted by the Serendib team) of" : "and paid for"} ${current.durationMins} minutes.\nFocus: ${current.focus}\n\n${meeting.meetingUrl ? `Google Meet: ${meeting.meetingUrl}` : "There is no meeting link yet — add one to the booking in your portal calendar, or connect Google Calendar under My hours so links are made for you."}\n\nYour calendar: ${config.appUrl}/portal/calendar`,
    kind: "notification",
  });

  return paid ?? current;
}
