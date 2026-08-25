"use client";

import Link from "next/link";
import { PageHeader } from "./page-header";
import { BookingRow } from "./booking-row";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { formatDate, formatDateTime, isPast, relativeTime } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, Loading, Progress, Stat } from "@/components/ui/primitives";
import { getChapter, phaseOne } from "@/data/vocabulary";
import type { User } from "@/lib/types";

export function StudentDashboard({ user }: { user: User }) {
  const bookings = useQuery(() => api.bookings.forUser(user.id), [user.id]);
  const homework = useQuery(() => api.homework.forStudent(user.id), [user.id]);
  const materials = useQuery(() => api.materials.forStudent(user.id), [user.id]);
  const tutors = useQuery(() => api.users.tutorsOf(user.id), [user.id]);
  const notes = useQuery(() => api.lessonNotes.forStudent(user.id), [user.id]);
  const results = useQuery(() => api.games.resultsFor(user.id), [user.id]);

  if (bookings.loading || homework.loading) {
    return <Loading label="Gathering your lessons" />;
  }

  const all = bookings.data ?? [];
  const upcoming = all.filter(
    (booking) => booking.status === "confirmed" && !isPast(booking.startsAt),
  );
  const awaitingPayment = all.filter((booking) => booking.status === "awaiting_payment");
  const completed = all.filter((booking) => booking.status === "completed");
  const outstanding = (homework.data ?? []).filter((item) => item.status !== "reviewed");
  const tutorsById = new Map((tutors.data ?? []).map((tutor) => [tutor.id, tutor]));

  const chaptersPlayed = new Set((results.data ?? []).map((result) => result.chapterId));
  const next = upcoming[0];

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Hello, ${firstName}`}>
        {next
          ? `Your next lesson is ${relativeTime(next.startsAt)} — ${formatDateTime(next.startsAt)}.`
          : "You have no lesson booked. The calendar has live availability whenever you are ready."}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lessons done" value={completed.length} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat
          label="Homework open"
          value={outstanding.length}
          hint={outstanding.length > 0 ? "Needs your attention" : "All caught up"}
        />
        <Stat
          label="Chapters played"
          value={`${chaptersPlayed.size}/${phaseOne.chapters.length}`}
        />
      </div>

      {awaitingPayment.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl">Waiting on payment</h2>
          <div className="space-y-3">
            {awaitingPayment.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                counterpart={tutorsById.get(booking.tutorId)}
                actions={
                  <ButtonLink href={`/portal/checkout/${booking.id}`} size="sm" variant="saffron">
                    Pay and confirm
                  </ButtonLink>
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Coming up</h2>
            <Link href="/portal/calendar" className="text-sm text-jade-700 hover:text-jade-600">
              Book another →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              icon="📅"
              title="Nothing booked yet"
              action={<ButtonLink href="/portal/calendar">Find a time</ButtonLink>}
            >
              Tutors publish real availability in your own timezone. Pick an hour and pay
              for that session only.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  counterpart={tutorsById.get(booking.tutorId)}
                  actions={
                    booking.meetingUrl ? (
                      <a
                        href={booking.meetingUrl}
                        className="text-sm font-medium text-jade-700 hover:text-jade-600"
                      >
                        Join link →
                      </a>
                    ) : null
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl">Homework</h2>
              <Link href="/portal/homework" className="text-sm text-jade-700 hover:text-jade-600">
                All tasks →
              </Link>
            </div>

            {outstanding.length === 0 ? (
              <EmptyState icon="✅" title="Nothing outstanding">
                Everything your tutors set has been marked.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {outstanding.map((item) => (
                  <Link
                    key={item.id}
                    href="/portal/homework"
                    className="block rounded-xl bg-white p-5 ring-1 ring-ink-900/8 transition hover:shadow-card"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={item.status === "submitted" ? "ocean" : "saffron"}>
                        {item.status === "submitted" ? "With your tutor" : "To do"}
                      </Badge>
                      <span className="text-xs text-ink-400">
                        Due {formatDate(item.dueAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-base text-ink-900">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">{item.brief}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Your tutors</h2>
              <Link href="/portal/messages" className="text-sm text-jade-700 hover:text-jade-600">
                Message
              </Link>
            </div>

            {(tutors.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                None yet. Book a lesson and your tutor will appear here.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {(tutors.data ?? []).map((tutor) => (
                  <li key={tutor.id}>
                    <p className="text-sm font-medium text-ink-800">{tutor.name}</p>
                    <p className="text-xs leading-snug text-ink-400">{tutor.headline}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Recent material</h2>
              <Link
                href="/portal/learning-hub"
                className="text-sm text-jade-700 hover:text-jade-600"
              >
                Hub
              </Link>
            </div>

            {(materials.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                Your hub is empty until a tutor assigns you something.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {(materials.data ?? []).slice(0, 3).map((material) => (
                  <li key={material.id}>
                    <p className="text-sm font-medium text-ink-800">{material.title}</p>
                    <p className="text-xs text-ink-400">{material.fileLabel ?? material.kind}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg">Games progress</h2>
            <Progress
              value={chaptersPlayed.size}
              max={phaseOne.chapters.length}
              className="mt-4"
            />
            <p className="mt-2 text-xs text-ink-400">
              {chaptersPlayed.size} of {phaseOne.chapters.length} chapters attempted
            </p>

            {(results.data ?? []).length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-ink-900/8 pt-4">
                {(results.data ?? []).slice(0, 3).map((result) => {
                  const chapter = getChapter(result.chapterId);
                  return (
                    <li
                      key={result.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-ink-600">
                        {chapter?.emoji} {chapter?.title}
                      </span>
                      <span className="shrink-0 font-medium text-ink-800">
                        {Math.round((result.correct / result.total) * 100)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <ButtonLink
              href="/games/languages"
              variant="secondary"
              size="sm"
              className="mt-5 w-full"
            >
              Play a chapter
            </ButtonLink>
          </Card>

          {(notes.data ?? []).length > 0 ? (
            <Card className="p-6">
              <h2 className="text-lg">Last lesson write-up</h2>
              {(notes.data ?? []).slice(0, 1).map((note) => (
                <div key={note.id} className="mt-3">
                  <p className="text-xs text-ink-400">{formatDate(note.date)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{note.summary}</p>
                  <p className="mt-3 text-xs font-semibold tracking-wide text-jade-700 uppercase">
                    Work on
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{note.workOn}</p>
                </div>
              ))}
              <Link
                href="/portal/homework"
                className="mt-4 block text-sm text-jade-700 hover:text-jade-600"
              >
                All write-ups →
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </>
  );
}
