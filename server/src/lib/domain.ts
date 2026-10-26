import { db } from "../db/database.ts";
import { notFound } from "./errors.ts";
import type {
  Booking,
  HomeworkItem,
  PublicTutor,
  Slot,
  StudentProgress,
  User,
} from "../../../shared/types.ts";

export const SLOT_MINUTES = 60;
const BOOKING_NOTICE_HOURS = 2;

export function minutesFromMidnight(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** A booking in either of these states occupies the tutor's slot. */
export function blocksSlot(booking: Booking): boolean {
  return booking.status === "confirmed" || booking.status === "awaiting_payment";
}

/** Approved tutors are on the public tutors page. No status means a tutor from before approvals. */
export function isListedTutor(user: User): boolean {
  return user.role === "tutor" && (user.tutorStatus ?? "approved") === "approved";
}

/**
 * Approved tutors with an email address can be booked. One an administrator
 * listed without an address is shown but not bookable: nobody could reach
 * them about the lesson, and they cannot sign in to teach it.
 */
export function isBookableTutor(user: User): boolean {
  return isListedTutor(user) && user.email !== "";
}

/** Everything about a tutor that is safe to show someone who is not logged in. */
export function publicTutor(user: User): PublicTutor {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    timezone: user.timezone,
    languages: user.languages,
    headline: user.headline,
    bio: user.bio,
    hourlyRateUsd: user.hourlyRateUsd,
    yearsTeaching: user.yearsTeaching,
    homeTown: user.homeTown,
    specialties: user.specialties,
    avatarUrl: user.avatarUrl,
    avatarId: user.avatarId,
    photoId: user.photoId,
    createdAt: user.createdAt,
    bookable: isBookableTutor(user),
  };
}

export function priceFor(tutor: User, durationMins: number): number {
  const rate = tutor.hourlyRateUsd ?? 25;
  return Math.round((rate * durationMins) / 60);
}

export async function requireUserRecord(userId: string): Promise<User> {
  const user = await db().users.findById(userId);
  if (!user) throw notFound("That account no longer exists.");
  return user;
}

/** One-hour slots inside a tutor's published blocks, minus what is taken. */
export async function openSlotsFor(tutorId: string, days: number): Promise<Slot[]> {
  const rules = await db().availability.find({ tutorId });
  const bookings = await db().bookings.find({ tutorId });
  const taken = bookings.filter(blocksSlot);

  const earliest = Date.now() + BOOKING_NOTICE_HOURS * 60 * 60 * 1000;
  const slots: Slot[] = [];
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(midnight);
    day.setDate(day.getDate() + offset);

    for (const rule of rules.filter((candidate) => candidate.weekday === day.getDay())) {
      const from = minutesFromMidnight(rule.start);
      const to = minutesFromMidnight(rule.end);

      for (let minute = from; minute + SLOT_MINUTES <= to; minute += SLOT_MINUTES) {
        const start = new Date(day);
        start.setMinutes(minute);
        if (start.getTime() < earliest) continue;

        const startMs = start.getTime();
        const endMs = startMs + SLOT_MINUTES * 60 * 1000;

        const clash = taken.some((booking) => {
          const bookedStart = new Date(booking.startsAt).getTime();
          return overlaps(
            startMs,
            endMs,
            bookedStart,
            bookedStart + booking.durationMins * 60 * 1000,
          );
        });
        if (clash) continue;

        slots.push({ tutorId, startsAt: start.toISOString(), durationMins: SLOT_MINUTES });
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function averageScore(items: HomeworkItem[]): number | undefined {
  const scored = items.filter((item) => typeof item.score === "number");
  if (scored.length === 0) return undefined;
  const total = scored.reduce((sum, item) => sum + (item.score ?? 0), 0);
  return Math.round(total / scored.length);
}

export async function progressFor(student: User): Promise<StudentProgress> {
  const bookings = await db().bookings.find({ studentId: student.id });
  const homework = await db().homework.find({ studentId: student.id });
  const results = await db().gameResults.find({ userId: student.id });

  const completed = bookings.filter((booking) => booking.status === "completed");
  const lastLesson = completed
    .slice()
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];

  return {
    student,
    lessonsCompleted: completed.length,
    upcomingLessons: bookings.filter((booking) => booking.status === "confirmed").length,
    homeworkOutstanding: homework.filter((item) => item.status !== "reviewed").length,
    averageScore: averageScore(homework),
    lastLessonAt: lastLesson?.startsAt,
    chaptersPractised: new Set(results.map((result) => result.chapterId)).size,
  };
}

/**
 * Whether a tutor may set work for, or look up, a student: one of their own
 * students (see `tuteeIdsOf`). Administrators are checked separately.
 */
export async function teaches(tutorId: string, studentId: string): Promise<boolean> {
  return (await tuteeIdsOf(tutorId)).includes(studentId);
}

/**
 * Anyone a tutor has a working relationship with: a booking, an assigned
 * material, or a piece of homework.
 */
export async function tuteeIdsOf(tutorId: string): Promise<string[]> {
  const bookings = await db().bookings.find({ tutorId });
  const materials = await db().materials.find({ ownerId: tutorId });
  const homework = await db().homework.find({ tutorId });

  return Array.from(
    new Set([
      ...bookings
        .filter((booking) => booking.status !== "cancelled")
        .map((booking) => booking.studentId),
      ...materials.flatMap((material) => material.assignedTo),
      ...homework.map((item) => item.studentId),
    ]),
  );
}
