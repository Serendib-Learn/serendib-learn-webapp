"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { photoUrlFor } from "@/lib/api/public";
import { useQuery } from "@/lib/hooks";
import { formatDateTime, rupees } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Alert, Avatar, Badge, Card, EmptyState, Loading, type Tone } from "@/components/ui/primitives";
import type { LessonPaidWith, MissedCause, PublicProfile, TutorHoursLesson, TutorHoursSummary } from "@/lib/types";

const hours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`;

const monthLabel = (month: Date) => month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const paidLabel: Record<LessonPaidWith, string> = {
  card: "Card",
  free_lesson: "Free lesson",
  recorded: "Recorded as paid",
  unpaid: "Not paid",
};

const causeLabel: Record<MissedCause, string> = {
  tutor_absent: "tutor did not come",
  technical: "technical problems",
  student_unable: "student could not make it",
  other: "something else",
};

function lessonStatus(lesson: TutorHoursLesson): { tone: Tone; label: string } {
  if (lesson.state === "cancelled") return { tone: "neutral", label: "Cancelled" };
  if (lesson.state === "upcoming") return { tone: "ocean", label: "Upcoming" };
  if (lesson.dispute) {
    return {
      tone: "clay",
      label: `Reported missed${lesson.dispute.cause ? ` — ${causeLabel[lesson.dispute.cause]}` : ""}${lesson.dispute.status === "approved" ? " (approved)" : ""}`,
    };
  }
  if (!lesson.writtenUp) return { tone: "saffron", label: "Awaiting write-up" };
  return { tone: "jade", label: "Verified" };
}

function paymentText(lesson: TutorHoursLesson) {
  if (lesson.paidWith !== "card" || lesson.amountCents === undefined) return paidLabel[lesson.paidWith];
  return `${rupees(lesson.amountCents)}${lesson.testPayment ? " (test)" : ""}`;
}

/** One row per lesson, for the accounts or a spreadsheet. */
function downloadCsv(tutors: TutorHoursSummary[], people: Map<string, PublicProfile>, month: Date) {
  const header = [
    "Tutor", "Student", "Starts", "Minutes", "Language", "State", "Status",
    "Paid with", "Card amount (LKR)", "Test payment", "Written up", "Verified", "Student rating",
  ];
  const rows = tutors.flatMap((tutor) =>
    tutor.lessons.map((lesson) => [
      tutor.tutorName,
      people.get(lesson.studentId)?.name ?? "Former student",
      lesson.startsAt,
      lesson.durationMins,
      lesson.language,
      lesson.state,
      lessonStatus(lesson).label,
      paidLabel[lesson.paidWith],
      lesson.amountCents === undefined ? "" : lesson.amountCents / 100,
      lesson.testPayment ? "yes" : "",
      lesson.writtenUp ? "yes" : "no",
      lesson.verified ? "yes" : "no",
      lesson.rating ?? "",
    ]),
  );
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `tutor-hours-${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Administration → Tutor hours: what each tutor taught in a month, what can
 * be paid for (verified: taught, written up, not reported missed), and what
 * was collected. Administrators only — the API refuses everyone else.
 */
export function AdminTutorHours() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const report = useQuery(
    () => api.reports.tutorHours(month.toISOString(), next.toISOString()),
    [month.getTime()],
  );
  const people = useQuery(() => api.users.directory(), []);
  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));

  const tutors = report.data?.tutors ?? [];
  const active = tutors.filter((tutor) => tutor.lessons.length > 0);
  const idle = tutors.filter((tutor) => tutor.lessons.length === 0);
  const total = (pick: (tutor: TutorHoursSummary) => number) => active.reduce((sum, tutor) => sum + pick(tutor), 0);
  const toCheck = total((tutor) => tutor.awaitingWriteUp + tutor.disputed);
  const isThisMonth = month.getTime() === new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous month"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            ‹
          </Button>
          <p className="min-w-36 text-center font-display text-lg text-forest">{monthLabel(month)}</p>
          <Button variant="ghost" size="sm" aria-label="Next month" onClick={() => setMonth(next)}>
            ›
          </Button>
          {isThisMonth ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            >
              This month
            </Button>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={active.length === 0}
          onClick={() => downloadCsv(active, byId, month)}
        >
          Download CSV
        </Button>
      </Card>

      {report.error ? <Alert>{report.error}</Alert> : null}
      {report.loading ? (
        <Loading label="Adding up hours" />
      ) : active.length === 0 ? (
        <EmptyState icon="🕰️" title={`No lessons in ${monthLabel(month)}`}>
          Lessons tutors teach, and paid lessons still to come, appear here month by month.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Hours taught" value={hours(total((tutor) => tutor.taughtMinutes))} />
            <Stat label="Verified for pay" value={hours(total((tutor) => tutor.verifiedMinutes))} />
            <Stat label="Collected by card" value={rupees(total((tutor) => tutor.cardCents))} />
            <Stat label="To check" value={String(toCheck)} warn={toCheck > 0} />
          </div>
          <p className="text-xs leading-relaxed text-ink-400">
            <strong className="text-ink-600">Verified</strong> lessons have been taught, written up by the tutor and not
            reported missed. Work out tutors&apos; pay from these. A lesson awaiting a write-up becomes verified once the
            tutor writes it up; a reported one once its report is declined under Requests. A report that the student
            could not make it doesn&apos;t count against the tutor.
          </p>
          {active.map((tutor) => (
            <TutorCard key={tutor.tutorId} tutor={tutor} people={byId} />
          ))}
        </>
      )}

      {idle.length > 0 && !report.loading ? (
        <p className="text-xs text-ink-400">
          No lessons this month: {idle.map((tutor) => tutor.tutorName).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-400">{label}</p>
      <p className={warn ? "mt-1 font-display text-2xl text-saffron-600" : "mt-1 font-display text-2xl text-forest"}>
        {value}
      </p>
    </Card>
  );
}

function TutorCard({ tutor, people }: { tutor: TutorHoursSummary; people: Map<string, PublicProfile> }) {
  const [open, setOpen] = useState(false);
  const profile = people.get(tutor.tutorId);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={tutor.tutorName} avatarId={profile?.avatarId} photoUrl={photoUrlFor(profile)} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink-800">{tutor.tutorName}</p>
          <p className="text-xs text-ink-400">
            {tutor.taughtLessons} taught · {tutor.upcomingLessons} to come
            {tutor.cancelledLessons ? ` · ${tutor.cancelledLessons} cancelled` : ""}
            {tutor.averageRating !== undefined
              ? ` · rated ${tutor.averageRating} / 5 by ${tutor.ratings} student${tutor.ratings === 1 ? "" : "s"}`
              : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tutor.awaitingWriteUp > 0 ? (
              <Badge tone="saffron">{tutor.awaitingWriteUp} awaiting write-up</Badge>
            ) : null}
            {tutor.disputed > 0 ? <Badge tone="clay">{tutor.disputed} reported missed</Badge> : null}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-right text-sm">
          <dt className="text-xs text-ink-400">Taught</dt>
          <dt className="text-xs text-ink-400">Verified</dt>
          <dt className="text-xs text-ink-400">Card</dt>
          <dd className="font-medium text-ink-800">{hours(tutor.taughtMinutes)}</dd>
          <dd className="font-medium text-jade-700">{hours(tutor.verifiedMinutes)}</dd>
          <dd className="font-medium text-ink-800">{rupees(tutor.cardCents)}</dd>
        </dl>
      </div>

      <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide lessons" : `Show ${tutor.lessons.length} lesson${tutor.lessons.length === 1 ? "" : "s"}`}
      </Button>

      {open ? (
        <ul className="divide-y divide-forest/10 border-t border-forest/10">
          {tutor.lessons.map((lesson) => {
            const status = lessonStatus(lesson);
            return (
              <li key={lesson.bookingId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="text-ink-800">
                    {formatDateTime(lesson.startsAt)} · {people.get(lesson.studentId)?.name ?? "Former student"}
                  </p>
                  <p className="text-xs text-ink-400">
                    {lesson.durationMins} min · <span className="capitalize">{lesson.language}</span> · {lesson.focus} ·{" "}
                    {paymentText(lesson)}
                    {lesson.rating !== undefined ? ` · rated ${lesson.rating}/5` : ""}
                  </p>
                </div>
                <Badge tone={status.tone}>{status.label}</Badge>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
