import { config } from "../config.ts";
import { db } from "../db/database.ts";
import {
  awaitsFeedback,
  lessonEndsAt,
  SECOND_REMINDER_MS,
  studentGaveFeedback,
  tutorWroteUp,
} from "./feedback.ts";
import { deliver } from "./mail.ts";
import type { Booking } from "../../../shared/types.ts";

/**
 * Lesson-feedback reminders, timed to the class: the first goes out as soon
 * as a lesson's end time passes, the second a day later if it is still not
 * done, and that is all. Each party is asked only for their own part — the
 * student for feedback, the tutor for the write-up — and only while it is
 * missing. Safe to run as often as you like: every send is recorded on the
 * booking, so nothing goes out twice.
 */
export async function runFeedbackReminders(now = Date.now()): Promise<number> {
  const candidates = await db().bookings.find({ status: { $in: ["confirmed", "completed"] } });
  let sent = 0;

  for (const booking of candidates.filter((item) => awaitsFeedback(item, now))) {
    const ended = lessonEndsAt(booking);
    const reminders = { student: [] as string[], tutor: [] as string[], ...booking.feedbackReminders };

    const due = (times: string[]) =>
      times.length === 0 || (times.length === 1 && now - ended >= SECOND_REMINDER_MS);

    let changed = false;

    if (due(reminders.student) && !(await studentGaveFeedback(booking.id))) {
      if (await remindStudent(booking, reminders.student.length === 0)) sent += 1;
      reminders.student = [...reminders.student, new Date(now).toISOString()];
      changed = true;
    }
    if (due(reminders.tutor) && !(await tutorWroteUp(booking.id))) {
      if (await remindTutor(booking, reminders.tutor.length === 0)) sent += 1;
      reminders.tutor = [...reminders.tutor, new Date(now).toISOString()];
      changed = true;
    }

    if (changed) await db().bookings.updateOne({ id: booking.id }, { feedbackReminders: reminders });
  }

  return sent;
}

async function remindStudent(booking: Booking, first: boolean): Promise<boolean> {
  const student = await db().users.findById(booking.studentId);
  const tutor = await db().users.findById(booking.tutorId);
  if (!student) return false;

  await deliver({
    to: student.email,
    subject: first
      ? `How was your lesson with ${tutor?.name ?? "your tutor"}?`
      : `A reminder: tell us how your lesson went`,
    body: `It takes a minute: a star rating and a sentence, or just a quick voice note if that is easier.\n\nOpen your portal at ${config.appUrl}/portal — your lesson on "${booking.focus}" is waiting at the top.\n\nYour feedback goes to your tutor and helps us keep every lesson on Serendib this good.`,
    kind: "notification",
  });
  return true;
}

async function remindTutor(booking: Booking, first: boolean): Promise<boolean> {
  const tutor = await db().users.findById(booking.tutorId);
  const student = await db().users.findById(booking.studentId);
  if (!tutor) return false;

  await deliver({
    to: tutor.email,
    subject: first
      ? `Write up your lesson with ${student?.name ?? "your student"}`
      : `Reminder: ${student?.name ?? "your student"} is waiting for their lesson write-up`,
    body: `A short note after every session is part of the Serendib promise: what you covered, what went well, what to work on, and the new words. A voice note works too.\n\nOpen your portal at ${config.appUrl}/portal — the lesson is waiting at the top.`,
    kind: "notification",
  });
  return true;
}

const HOUR_MS = 60 * 60 * 1000;

/** Where to find every lesson, from any email. */
export function calendarLink(): string {
  return `${config.appUrl}/portal/calendar`;
}

function when(booking: Booking, timezone: string): string {
  return new Date(booking.startsAt).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
}

/**
 * Before-the-lesson reminders: a day ahead and an hour ahead, to both the
 * student and the tutor, with the Google Meet link to join from and the
 * portal calendar. Recorded on the booking, so each goes out once.
 */
export async function runLessonReminders(now = Date.now()): Promise<number> {
  const upcoming = await db().bookings.find({ status: "confirmed" });
  let sent = 0;

  for (const booking of upcoming) {
    const startsIn = new Date(booking.startsAt).getTime() - now;
    if (startsIn <= 0) continue;
    const reminders = { ...booking.lessonReminders };

    let which: "day" | "hour" | null = null;
    if (startsIn <= HOUR_MS && !reminders.hour) which = "hour";
    else if (startsIn <= 24 * HOUR_MS && startsIn > HOUR_MS && !reminders.day) which = "day";
    if (!which) continue;

    const student = await db().users.findById(booking.studentId);
    const tutor = await db().users.findById(booking.tutorId);
    const join = booking.meetingUrl
      ? `Join on Google Meet: ${booking.meetingUrl}`
      : "The meeting link will be on the booking in your portal calendar.";

    for (const [person, other] of [
      [student, tutor],
      [tutor, student],
    ] as const) {
      if (!person) continue;
      await deliver({
        to: person.email,
        subject:
          which === "hour"
            ? `Your lesson with ${other?.name ?? "Serendib"} starts within the hour`
            : `Tomorrow: your lesson with ${other?.name ?? "Serendib"}`,
        body: `${when(booking, person.timezone || "UTC")}\n${booking.durationMins} minutes · ${booking.focus}\n\n${join}\n\nYour calendar: ${calendarLink()}`,
        kind: "notification",
      });
      sent += 1;
    }

    reminders[which] = new Date(now).toISOString();
    // An hour-ahead reminder makes a missed day-ahead one moot.
    if (which === "hour" && !reminders.day) reminders.day = reminders.hour;
    await db().bookings.updateOne({ id: booking.id }, { lessonReminders: reminders });
  }

  return sent;
}

/** Everything timed: before-the-lesson and after-the-lesson reminders. */
export async function runReminders(now = Date.now()): Promise<{ lesson: number; feedback: number }> {
  return {
    lesson: await runLessonReminders(now),
    feedback: await runFeedbackReminders(now),
  };
}

/** Starts the in-process timer, unless REMINDER_INTERVAL_MS is 0. */
export function startReminderTimer(): void {
  if (!config.reminderIntervalMs) return;
  const timer = setInterval(() => {
    runReminders().catch((error) => console.error("Reminders failed:", error));
  }, config.reminderIntervalMs);
  // Never the only thing keeping the process alive.
  timer.unref();
}
