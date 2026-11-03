import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { confirmBooking } from "./booking-confirmation.ts";
import { blocksSlot, isBookableTutor, lessonPriceLkr, openSlotsFor, overlaps, SLOT_MINUTES } from "./domain.ts";
import { ApiError, forbidden } from "./errors.ts";
import { newId, nowIso } from "./ids.ts";
import { deliver } from "./mail.ts";
import { paymentsConfig, paymentsEnabled, refreshFromCheckout } from "./payments.ts";
import { formatInZone } from "./time.ts";
import type {
  Booking,
  BookingPayment,
  BundleDetail,
  BundleLessonInput,
  LessonBundle,
  User,
} from "../../../shared/types.ts";

/**
 * Bundles: a student picks 5 or 10 open hours (any tutors) and pays for them
 * all with one checkout. Each lesson is an ordinary booking carrying
 * `bundleId`, so once paid it is moved, cancelled, reminded and reported like
 * any other. Until then the bundle is one unit: paid together, released
 * together, and its lessons cannot be paid for one by one.
 */

/** How far ahead a bundle's lessons can be (the calendar shows the same): ten weekly lessons fit. */
const BUNDLE_HORIZON_DAYS = 90;
/** How long a bundle holds its hours before its checkout is opened, as a single booking does. */
const UNPAID_HOLD_MINUTES = 30;
/** Payments.lk's own expiry, plus time for a last-second payment to report back. */
const CHECKOUT_GRACE_MINUTES = 5;

export async function bundleDetail(bundle: LessonBundle): Promise<BundleDetail> {
  const bookings = await db().bookings.find({ id: { $in: bundle.bookingIds } });
  bookings.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { bundle, bookings };
}

/** Books the chosen hours as one unpaid bundle, after checking every one is open. */
export async function createBundle(student: User, lessons: BundleLessonInput[]): Promise<LessonBundle> {
  if (student.role !== "student") throw forbidden("Bundles are booked by students.");
  const sizes = config.payments.bundleSizes;
  if (!sizes.includes(lessons.length)) {
    throw new ApiError(`A bundle is ${sizes.join(" or ")} lessons. You have chosen ${lessons.length}.`);
  }

  // No two at the same time: one student cannot be in two lessons at once.
  const times = lessons.map((lesson) => new Date(lesson.startsAt).getTime());
  if (times.some((time) => Number.isNaN(time))) throw new ApiError("One of the times did not come through. Pick it again.");
  for (let i = 0; i < times.length; i += 1) {
    for (let j = i + 1; j < times.length; j += 1) {
      if (overlaps(times[i], times[i] + SLOT_MINUTES * 60_000, times[j], times[j] + SLOT_MINUTES * 60_000)) {
        throw new ApiError("Two of your lessons are at the same time. Swap one for another hour.");
      }
    }
  }

  // Every hour must be one the tutor has open, in a language they teach.
  const tutors = new Map<string, User>();
  const openByTutor = new Map<string, Set<string>>();
  for (const lesson of lessons) {
    if (!tutors.has(lesson.tutorId)) {
      const tutor = await db().users.findById(lesson.tutorId);
      if (!tutor || tutor.role !== "tutor" || !isBookableTutor(tutor)) {
        throw new ApiError("One of those tutors is not taking bookings. Pick another hour.");
      }
      tutors.set(tutor.id, tutor);
      const open = await openSlotsFor(tutor.id, BUNDLE_HORIZON_DAYS);
      openByTutor.set(tutor.id, new Set(open.map((slot) => slot.startsAt)));
    }
    const tutor = tutors.get(lesson.tutorId)!;
    if (!tutor.languages.includes(lesson.language)) {
      throw new ApiError(`${tutor.name} does not teach ${lesson.language === "tamil" ? "Tamil" : "Sinhala"}.`);
    }
    if (!openByTutor.get(tutor.id)!.has(new Date(lesson.startsAt).toISOString())) {
      throw new ApiError(
        `${tutor.name} is no longer free at ${formatInZone(lesson.startsAt, student.timezone)}. Pick another hour.`,
      );
    }
  }

  const bundleId = newId("bn");
  const bookings: Booking[] = lessons.map((lesson) => ({
    id: newId("bk"),
    tutorId: lesson.tutorId,
    studentId: student.id,
    startsAt: new Date(lesson.startsAt).toISOString(),
    durationMins: SLOT_MINUTES,
    language: lesson.language,
    focus: lesson.focus.trim().slice(0, 200) || "Bundle lesson",
    status: "awaiting_payment",
    priceLkr: lessonPriceLkr(SLOT_MINUTES),
    bundleId,
    createdAt: nowIso(),
  }));

  // Booked one by one; if someone takes an hour in the meantime, undo the rest.
  const made: Booking[] = [];
  for (const booking of bookings) {
    const start = new Date(booking.startsAt).getTime();
    const taken = (await db().bookings.find({ tutorId: booking.tutorId }))
      .filter(blocksSlot)
      .some((other) => overlaps(start, start + booking.durationMins * 60_000, new Date(other.startsAt).getTime(), new Date(other.startsAt).getTime() + other.durationMins * 60_000));
    if (taken) {
      for (const undo of made) await db().bookings.deleteOne({ id: undo.id });
      throw new ApiError("Someone just took one of those hours. Pick another one.");
    }
    made.push(await db().bookings.insertOne(booking));
  }

  return db().bundles.insertOne({
    id: bundleId,
    studentId: student.id,
    size: bookings.length,
    bookingIds: bookings.map((booking) => booking.id),
    priceLkr: bookings.reduce((sum, booking) => sum + booking.priceLkr, 0),
    status: "awaiting_payment",
    createdAt: nowIso(),
  });
}

/**
 * Marks a bundle paid and confirms each lesson (Meet link, calendar invite),
 * then sends one receipt for them all and one note to each tutor. Safe to
 * call more than once: a webhook and the checkout page's check can both
 * arrive, and only the first does anything.
 */
export async function confirmBundle(bundle: LessonBundle, payment?: BookingPayment): Promise<LessonBundle> {
  const current = (await db().bundles.findById(bundle.id)) ?? bundle;
  if (current.status === "confirmed") return current;

  const confirmed: Booking[] = [];
  for (const id of current.bookingIds) {
    const booking = await db().bookings.findById(id);
    if (!booking) continue;
    // Each lesson carries its share of the payment, as a single booking would.
    const changes = payment ? { payment: { ...payment, amountCents: booking.priceLkr * 100 } } : {};
    confirmed.push(await confirmBooking(booking, changes, { quiet: true }));
  }

  const paid =
    (await db().bundles.updateOne(
      { id: current.id },
      { status: "confirmed", paidAt: nowIso(), ...(payment ? { payment } : {}), cancelReason: undefined },
    )) ?? current;

  const student = await db().users.findById(current.studentId);
  const tutorIds = [...new Set(confirmed.map((booking) => booking.tutorId))];
  const tutors = new Map((await db().users.find({ id: { $in: tutorIds } })).map((tutor) => [tutor.id, tutor]));
  confirmed.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  if (student) {
    const lines = confirmed.map(
      (booking) =>
        `${formatInZone(booking.startsAt, student.timezone)} with ${tutors.get(booking.tutorId)?.name ?? "your tutor"}${booking.meetingUrl ? `\n  Join: ${booking.meetingUrl}` : ""}`,
    );
    await deliver({
      to: student.email,
      subject: `Receipt: Rs. ${current.priceLkr.toLocaleString("en-LK")} for ${current.size} lessons`,
      body: `Payment received${payment?.card ? ` (${payment.card})` : ""}. Your ${current.size} lessons are booked:\n\n${lines.join("\n")}\n\nEach one is in your calendar, with its meeting link: ${config.appUrl}/portal/calendar\n\nYou can move or cancel any of them up to 6 hours before it starts and keep the lesson. We will remind you a day before and an hour before each one.`,
      kind: "receipt",
    });
  }

  for (const tutor of tutors.values()) {
    const theirs = confirmed.filter((booking) => booking.tutorId === tutor.id);
    const lines = theirs.map((booking) => `${formatInZone(booking.startsAt, tutor.timezone)}: ${booking.focus}`);
    await deliver({
      to: tutor.email,
      subject: `New bookings: ${student?.name ?? "a student"}, ${theirs.length} lesson${theirs.length === 1 ? "" : "s"}`,
      body: `${student?.name ?? "A student"} has booked and paid for ${theirs.length} lesson${theirs.length === 1 ? "" : "s"} with you:\n\n${lines.join("\n")}\n\nEach one is in your portal calendar, with its meeting link: ${config.appUrl}/portal/calendar`,
      kind: "notification",
    });
  }

  return paid;
}

/** Cancels an unpaid bundle and frees all its hours. Does nothing once it is paid. */
export async function releaseBundle(bundle: LessonBundle, reason: string): Promise<boolean> {
  const current = await db().bundles.findById(bundle.id);
  if (current?.status !== "awaiting_payment") return false;
  if (current.payment?.checkoutId !== bundle.payment?.checkoutId) return false;
  await db().bundles.updateOne({ id: current.id }, { status: "cancelled", cancelReason: reason });
  for (const id of current.bookingIds) {
    await db().bookings.updateOne({ id, status: "awaiting_payment" }, { status: "cancelled", cancelReason: reason });
  }
  return true;
}

/** Brings a bundle up to date from its checkout, for when the webhook has not arrived. */
export async function syncBundlePayment(bundle: LessonBundle): Promise<LessonBundle> {
  if (!paymentsEnabled() || !bundle.payment || bundle.status !== "awaiting_payment") return bundle;
  const outcome = await refreshFromCheckout(bundle.payment);
  if (outcome.kind === "paid") {
    if (outcome.payment.amountCents !== bundle.payment.amountCents) return bundle;
    return confirmBundle(bundle, outcome.payment);
  }
  if (outcome.kind === "expired") {
    await releaseBundle(bundle, "The checkout expired before payment.");
  } else {
    await db().bundles.updateOne({ id: bundle.id }, { payment: outcome.payment });
  }
  return (await db().bundles.findById(bundle.id)) ?? bundle;
}

async function tellStudentReleased(bundle: LessonBundle) {
  const student = await db().users.findById(bundle.studentId);
  if (!student) return;
  await deliver({
    to: student.email,
    subject: "Your lessons were released",
    body: `Your ${bundle.size} lessons were not paid for in time, so the hours have been released for others. Nothing has been charged. You can book again from the portal calendar whenever you are ready.`,
    kind: "notification",
  });
}

/**
 * Releases every bundle that has held its hours too long without being paid,
 * as `releaseUnpaidBookings` does for single bookings; run with the reminders.
 */
export async function releaseUnpaidBundles(now = Date.now()): Promise<number> {
  const waiting = await db().bundles.find({ status: "awaiting_payment" });
  let released = 0;

  for (const bundle of waiting) {
    const holdEnds = bundle.payment
      ? new Date(bundle.payment.expiresAt).getTime() + CHECKOUT_GRACE_MINUTES * 60_000
      : new Date(bundle.createdAt).getTime() + UNPAID_HOLD_MINUTES * 60_000;
    if (holdEnds > now) continue;

    if (bundle.payment && paymentsEnabled() && bundle.payment.mode === paymentsConfig().mode) {
      try {
        const current = await syncBundlePayment(bundle);
        if (current.status === "cancelled") {
          released += 1;
          await tellStudentReleased(current);
        }
      } catch (error) {
        console.error(`Unpaid bundle ${bundle.id}: could not read its checkout, trying again later.`, error);
      }
      continue;
    }

    const reason = bundle.payment
      ? "The checkout expired before payment."
      : `Not paid within ${UNPAID_HOLD_MINUTES} minutes of booking.`;
    if (await releaseBundle(bundle, reason)) {
      released += 1;
      await tellStudentReleased(bundle);
    }
  }
  return released;
}
