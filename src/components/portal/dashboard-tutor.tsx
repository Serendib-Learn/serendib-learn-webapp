"use client";

import Link from "next/link";
import { GlanceHeader } from "./glance-header";
import { BookingRow } from "./booking-row";
import { FeedbackList } from "./feedback-list";
import { api } from "@/lib/api";
import { photoUrlFor } from "@/lib/api/public";
import { useQuery } from "@/lib/hooks";
import { formatDate, formatDateTime, isPast, relativeTime } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Avatar, Badge, Card, EmptyState, Loading, Stat } from "@/components/ui/primitives";
import type { User } from "@/lib/types";

export function TutorDashboard({ user }: { user: User }) {
  const bookings = useQuery(() => api.bookings.forUser(user.id), [user.id]);
  const tutees = useQuery(() => api.users.tuteesOf(user.id), [user.id]);
  const homework = useQuery(() => api.homework.forTutor(user.id), [user.id]);
  const materials = useQuery(() => api.materials.forOwner(user.id), [user.id]);
  const availability = useQuery(() => api.availability.forTutor(user.id), [user.id]);
  const progress = useQuery(() => api.lessonNotes.progressFor(user.id), [user.id]);
  const feedback = useQuery(() => api.feedback.forTutor(user.id), [user.id]);
  const people = useQuery(() => api.users.directory(), []);

  if (bookings.loading || tutees.loading) {
    return <Loading label="Gathering your students" />;
  }

  const all = bookings.data ?? [];
  const upcoming = all.filter(
    (booking) => booking.status === "confirmed" && !isPast(booking.startsAt),
  );
  const completed = all.filter((booking) => booking.status === "completed");
  const toReview = (homework.data ?? []).filter((item) => item.status === "submitted");
  const studentsById = new Map((tutees.data ?? []).map((student) => [student.id, student]));

  // Hours, not money: what a tutor is paid is still being decided.
  const taughtMinutes = completed.reduce((sum, booking) => sum + booking.durationMins, 0);
  const next = upcoming[0];
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <GlanceHeader
        title={`Hello, ${firstName}`}
        action={
          <ButtonLink href="/portal/learning-hub" size="sm">
            Upload material
          </ButtonLink>
        }
      >
        {next
          ? `Next up: ${studentsById.get(next.studentId)?.name ?? "a student"} ${relativeTime(next.startsAt)}, ${formatDateTime(next.startsAt)}.`
          : "Nothing on the calendar. Check your availability so students can book you."}
      </GlanceHeader>

      {user.tutorStatus === "pending" ? (
        <Alert tone="saffron" className="mb-6">
          Your application is with our team. We vet every tutor personally, and students can
          find and book you as soon as you are approved. Meanwhile, fill in your profile below
          and publish your hours in the calendar so you are ready on day one.
        </Alert>
      ) : null}
      {!user.bio || !user.headline ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="font-medium text-ink-800">Finish your tutor profile</p>
            <p className="text-xs leading-relaxed text-ink-500">
              Students choose a tutor from your headline and introduction — add both so they
              know who they are booking.
            </p>
          </div>
          <ButtonLink href="/portal/profile" size="sm">
            Edit profile
          </ButtonLink>
        </Card>
      ) : null}
      {user.tutorStatus === "rejected" ? (
        <Alert className="mb-6">
          Your tutor application was not approved, so students cannot book you. Check your
          email for a note from the team, or message them if you think this is a mistake.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tutees" value={(tutees.data ?? []).length} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat
          label="To mark"
          value={toReview.length}
          hint={toReview.length > 0 ? "Students are waiting" : "Nothing pending"}
        />
        <Stat
          label="Taught"
          value={`${Math.round((taughtMinutes / 60) * 10) / 10} h`}
          hint={`${completed.length} lessons taught`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Your schedule</h2>
            <Link href="/portal/calendar" className="text-sm text-jade-700 hover:text-jade-600">
              Manage availability →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              icon="🗓️"
              title="No sessions booked"
              action={<ButtonLink href="/portal/calendar">Set your availability</ButtonLink>}
            >
              Students can only book hours you have published. Add some blocks and they
              will start appearing here.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  counterpart={studentsById.get(booking.studentId)}
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
              <h2 className="text-xl">Waiting to be marked</h2>
              <Link href="/portal/homework" className="text-sm text-jade-700 hover:text-jade-600">
                All homework →
              </Link>
            </div>

            {toReview.length === 0 ? (
              <EmptyState icon="📝" title="Nothing to mark">
                When a student submits, it will land here.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {toReview.map((item) => (
                  <Link
                    key={item.id}
                    href="/portal/homework"
                    className="block rounded-xl bg-white p-5 border border-forest/10 transition hover:shadow-card"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="ocean">Submitted</Badge>
                      <span className="text-xs text-ink-400">
                        {studentsById.get(item.studentId)?.name} · due {formatDate(item.dueAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-base text-ink-900">{item.title}</p>
                    {item.submissionNote ? (
                      <p className="mt-1 text-sm leading-relaxed text-ink-500">
                        &ldquo;{item.submissionNote}&rdquo;
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          {(feedback.data ?? []).length > 0 ? (
            <Card className="p-6">
              <h2 className="text-lg">What your students said</h2>
              <p className="mt-1 text-xs text-ink-400">
                Average{" "}
                {(
                  (feedback.data ?? []).reduce((sum, item) => sum + item.rating, 0) /
                  (feedback.data ?? []).length
                ).toFixed(1)}{" "}
                ★ from {(feedback.data ?? []).length} lesson
                {(feedback.data ?? []).length === 1 ? "" : "s"}
              </p>
              <div className="mt-4">
                <FeedbackList
                  items={(feedback.data ?? []).slice(0, 3)}
                  people={new Map((people.data ?? []).map((person) => [person.id, person]))}
                />
              </div>
            </Card>
          ) : null}

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Your tutees</h2>
              <Link href="/portal/homework" className="text-sm text-jade-700 hover:text-jade-600">
                Progress
              </Link>
            </div>

            {(progress.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                No students yet. They appear once a booking is made or material assigned.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {(progress.data ?? []).map((entry) => (
                  <li key={entry.student.id} className="flex items-start gap-3">
                    <Avatar name={entry.student.name} avatarId={entry.student.avatarId} photoUrl={photoUrlFor(entry.student)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {entry.student.name}
                      </p>
                      <p className="text-xs text-ink-400">
                        {entry.lessonsCompleted} lessons ·{" "}
                        {entry.homeworkOutstanding > 0
                          ? `${entry.homeworkOutstanding} open`
                          : "up to date"}
                        {typeof entry.averageScore === "number"
                          ? ` · avg ${entry.averageScore}%`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Availability</h2>
              <Link href="/portal/calendar" className="text-sm text-jade-700 hover:text-jade-600">
                Edit
              </Link>
            </div>
            <p className="mt-3 text-sm text-ink-500">
              {(availability.data ?? []).length} weekly {" "}
              {(availability.data ?? []).length === 1 ? "block" : "blocks"} published.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Your material</h2>
              <Link
                href="/portal/learning-hub"
                className="text-sm text-jade-700 hover:text-jade-600"
              >
                Hub
              </Link>
            </div>

            {(materials.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                Nothing uploaded yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {(materials.data ?? []).slice(0, 4).map((material) => (
                  <li key={material.id}>
                    <p className="truncate text-sm font-medium text-ink-800">
                      {material.title}
                    </p>
                    <p className="text-xs text-ink-400">
                      {material.assignedTo.length === 0
                        ? "Unassigned"
                        : `Assigned to ${material.assignedTo.length}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
