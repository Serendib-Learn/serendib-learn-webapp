"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { formatDateTime, formatTime, groupByDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Badge, Card, Loading } from "@/components/ui/primitives";
import type { Booking, MissedCause, StudentRequest, User } from "@/lib/types";

/** Mirrors STUDENT_RESCHEDULE_NOTICE_HOURS in server/src/routes/bookings.ts. */
export const STUDENT_RESCHEDULE_NOTICE_HOURS = 24;

/** Mirrors MISSED_REPORT_DAYS in server/src/routes/requests.ts. */
export const MISSED_REPORT_DAYS = 30;

export function canStudentReschedule(booking: Booking): boolean {
  return new Date(booking.startsAt).getTime() - Date.now() >= STUDENT_RESCHEDULE_NOTICE_HOURS * 3600_000;
}

export function canReportMissed(booking: Booking): boolean {
  const started = new Date(booking.startsAt).getTime();
  return (
    (booking.status === "confirmed" || booking.status === "completed") &&
    started < Date.now() &&
    Date.now() - started <= MISSED_REPORT_DAYS * 86_400_000
  );
}

/**
 * Moving a lesson to another of the tutor's open hours. Free: the price,
 * payment and meeting link stay with it.
 */
export function RescheduleDialog({
  booking,
  viewer,
  onClose,
}: {
  booking: Booking;
  viewer: User;
  onClose: () => void;
}) {
  const slots = useQuery(() => api.availability.openSlots(booking.tutorId, 30), [booking.tutorId]);
  const [chosen, setChosen] = useState("");
  const move = useAction(() => api.bookings.reschedule(booking.id, chosen));
  const isStudent = viewer.role === "student";
  const tooLate = isStudent && !canStudentReschedule(booking);
  const days = groupByDay(slots.data ?? [], (slot) => slot.startsAt);

  return (
    <Modal
      open
      onClose={onClose}
      title="Move this lesson"
      description={`Now ${formatDateTime(booking.startsAt)}. Moving it is free — the price, payment and meeting link stay the same, and both of you are emailed the new time.`}
      className="sm:max-w-xl"
    >
      {tooLate ? (
        <div className="space-y-4">
          <Alert tone="saffron">
            Lessons can be moved up to {STUDENT_RESCHEDULE_NOTICE_HOURS} hours before they start.
            For anything later, message your tutor — or, if you cannot make it, report it under
            &ldquo;Free lessons &amp; help&rdquo; once the time has passed and we will sort it out.
          </Alert>
          <Button className="w-full" onClick={onClose}>
            OK
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await move.run()) onClose();
          }}
        >
          {slots.loading ? (
            <Loading label="Finding open hours" />
          ) : days.length === 0 ? (
            <Alert tone="saffron">
              There are no open hours in the next 30 days. Ask your tutor to add some, or message us.
            </Alert>
          ) : (
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {days.map((day) => (
                <div key={day.label}>
                  <p className="mb-2 text-xs font-medium text-ink-500">{day.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {day.entries.map((slot) => (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => setChosen(slot.startsAt)}
                        className={
                          chosen === slot.startsAt
                            ? "rounded-md bg-forest px-3 py-1.5 text-sm text-cream"
                            : "rounded-md border border-forest/15 bg-white px-3 py-1.5 text-sm text-forest hover:border-amber-spice/60"
                        }
                      >
                        {formatTime(slot.startsAt)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {move.error ? <Alert>{move.error}</Alert> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Keep the current time
            </Button>
            <Button type="submit" disabled={!chosen || move.pending}>
              {move.pending ? "Moving…" : chosen ? `Move to ${formatDateTime(chosen)}` : "Pick a new time"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const causes: { value: MissedCause; label: string }[] = [
  { value: "tutor_absent", label: "My tutor did not come" },
  { value: "technical", label: "Technical problems (connection, link, audio)" },
  { value: "student_unable", label: "I could not make it" },
  { value: "other", label: "Something else" },
];

/** A student telling the team a lesson was missed. An administrator decides on a make-up lesson. */
export function MissedLessonDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [cause, setCause] = useState<MissedCause>("tutor_absent");
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const report = useAction(() =>
    api.requests.create({ kind: "missed_session", bookingId: booking.id, cause, reason: reason.trim() }),
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={sent ? "Thanks — we are on it" : "Report a missed lesson"}
      description={sent ? undefined : `The lesson on ${formatDateTime(booking.startsAt)}. The Serendib team reads every report and can give you a free make-up lesson.`}
    >
      {sent ? (
        <div className="space-y-4">
          <Alert tone="jade">
            We will look into it and email you. If we approve a make-up lesson, it appears under
            &ldquo;Free lessons &amp; help&rdquo; in your calendar, ready to book.
          </Alert>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await report.run()) setSent(true);
          }}
        >
          <Field label="What happened?" htmlFor="missed-cause">
            <Select id="missed-cause" value={cause} onChange={(event) => setCause(event.target.value as MissedCause)}>
              {causes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tell us a little more" htmlFor="missed-reason" hint="A sentence or two is plenty.">
            <Textarea
              id="missed-reason"
              value={reason}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
              placeholder="I waited on the Meet link for 20 minutes and nobody joined."
            />
          </Field>
          {report.error ? <Alert>{report.error}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={report.pending || reason.trim().length < 10}>
              {report.pending ? "Sending…" : "Send to the team"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const statusTone = { pending: "saffron", approved: "jade", declined: "clay" } as const;
const statusText = { pending: "Waiting for the team", approved: "Approved", declined: "Not approved" } as const;

function describe(item: StudentRequest): string {
  return item.kind === "free_session" ? "Free session" : "Missed lesson";
}

/**
 * A student's free lessons and requests to the team: how many free lessons
 * are left to book, asking for one, and what became of each request.
 */
export function FreeLessonsPanel() {
  const credits = useQuery(() => api.requests.credits(), []);
  const requests = useQuery(() => api.requests.list(), []);
  const [asking, setAsking] = useState(false);
  const available = credits.data?.available ?? 0;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl text-forest">Free lessons &amp; help</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            {available > 0
              ? `You have ${available} free lesson${available === 1 ? "" : "s"} to book. Pick any open hour above and choose “Book with a free lesson”.`
              : "Moving a booked lesson is always free. You can also ask us for a free session, or report a missed lesson from “Your sessions” below."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {available > 0 ? <Badge tone="jade">{available} free</Badge> : null}
          <Button size="sm" variant="secondary" onClick={() => setAsking(true)}>
            Ask for a free session
          </Button>
        </div>
      </div>

      {(requests.data ?? []).length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-ink-900/8 pt-4">
          {(requests.data ?? []).slice(0, 6).map((item) => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="text-ink-800">
                  {describe(item)} · <span className="text-ink-400">asked {formatDateTime(item.createdAt)}</span>
                </p>
                {item.decisionNote ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">&ldquo;{item.decisionNote}&rdquo;</p>
                ) : null}
              </div>
              <Badge tone={statusTone[item.status]}>{statusText[item.status]}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {asking ? <FreeSessionDialog onClose={() => setAsking(false)} /> : null}
    </Card>
  );
}

function FreeSessionDialog({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const ask = useAction(() => api.requests.create({ kind: "free_session", reason: reason.trim() }));

  return (
    <Modal
      open
      onClose={onClose}
      title={sent ? "Request sent" : "Ask for a free session"}
      description={sent ? undefined : "The Serendib team reads every request. If we approve it, you get a free lesson to book with any tutor."}
    >
      {sent ? (
        <div className="space-y-4">
          <Alert tone="jade">We will email you with our answer, usually within a day or two.</Alert>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await ask.run()) setSent(true);
          }}
        >
          <Field label="Why would a free session help?" htmlFor="free-reason" hint="For example: trying us out, money is tight this month, or a lesson that did not go to plan.">
            <Textarea
              id="free-reason"
              value={reason}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {ask.error ? <Alert>{ask.error}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={ask.pending || reason.trim().length < 10}>
              {ask.pending ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
