"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { formatTime, isPast, money } from "@/lib/format";
import { CATEGORY_LABEL } from "@/data/holidays";
import { AvailabilityEditor } from "@/components/portal/availability-editor";
import { HolidaysPanel } from "@/components/portal/holidays-panel";
import { HOLIDAY_BY_DATE, MonthCalendar, toISODate, type DayMarks } from "@/components/portal/month-calendar";
import { BookingRow } from "@/components/portal/booking-row";
import { GoogleCalendarConnect } from "@/components/portal/google-calendar-connect";
import { PageHeader } from "@/components/portal/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, EmptyState, Loading } from "@/components/ui/primitives";
import type { Booking, LanguageCode, PublicTutor, Slot, User } from "@/lib/types";

const googleConnectMessages = {
  connected: { tone: "jade" as const, text: "Google Calendar is connected." },
  error: {
    tone: "clay" as const,
    text: "Could not connect Google Calendar. Try again.",
  },
  cancelled: { tone: "saffron" as const, text: "Google Calendar connection was cancelled." },
};

function GoogleConnectBanner() {
  const params = useSearchParams();
  const outcome = params.get("google") as keyof typeof googleConnectMessages | null;
  const message = outcome ? googleConnectMessages[outcome] : null;
  if (!message) return null;

  return (
    <div className="mb-6">
      <Alert tone={message.tone}>{message.text}</Alert>
    </div>
  );
}

type Filter = "upcoming" | "past" | "all";

export default function CalendarPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Calendar />
    </Suspense>
  );
}

function Calendar() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  const isTutor = user.role === "tutor";

  return (
    <>
      <PageHeader title="Calendar">
        Pick a day, see what&apos;s open, and book a session - no other site needed.
      </PageHeader>

      {isTutor ? <GoogleConnectBanner /> : null}

      <CalendarWorkspace user={user} />

      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl text-forest">Your sessions</h2>
        <Schedule userId={user.id} isTutor={isTutor} />
      </section>

      {isTutor ? (
        <section id="hours" className="mt-12 scroll-mt-24 space-y-6">
          <h2 className="font-display text-xl text-forest">My hours</h2>
          <GoogleCalendarConnect />
          <AvailabilityEditor tutorId={user.id} />
        </section>
      ) : null}
    </>
  );
}

const focusIdeas = [
  "Survival phrases for a Colombo trip",
  "Greetings and family words",
  "Reading the Sinhala alphabet",
  "Tamil pronunciation drill",
  "Talking to relatives on the phone",
];

/**
 * The original site's calendar: a month on the left, the chosen day and the
 * Sri Lankan holidays on the right. Days show dots for open hours (students),
 * your own sessions, and holidays; a student books an open hour right here.
 */
function CalendarWorkspace({ user }: { user: User }) {
  const isStudent = user.role === "student";
  const params = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(todayISO);
  const [tutorFilter, setTutorFilter] = useState(params.get("tutor") ?? "");

  const bookings = useQuery(() => api.bookings.forUser(user.id), [user.id]);
  const people = useQuery(() => api.users.directory(), []);
  const tutors = useQuery(() => (isStudent ? api.users.tutors() : Promise.resolve([])), [isStudent]);
  const tutorIds = (tutors.data ?? []).map((tutor) => tutor.id).join(",");
  const slots = useQuery(async () => {
    if (!isStudent) return [];
    const ids = (tutorFilter ? [tutorFilter] : tutorIds.split(",")).filter(Boolean);
    const lists = await Promise.all(ids.map((id) => api.availability.openSlots(id, 60)));
    return lists.flat();
  }, [isStudent, tutorFilter, tutorIds]);

  const mine = (bookings.data ?? []).filter((booking) => booking.status !== "cancelled");
  const marks: Record<string, DayMarks> = {};
  for (const slot of slots.data ?? []) {
    const key = toISODate(new Date(slot.startsAt));
    marks[key] = { ...marks[key], open: true };
  }
  for (const booking of mine) {
    const key = toISODate(new Date(booking.startsAt));
    marks[key] = { ...marks[key], booked: true };
  }

  const tutorsById = new Map((tutors.data ?? []).map((tutor) => [tutor.id, tutor]));
  const peopleById = new Map((people.data ?? []).map((person) => [person.id, person]));
  const daySessions = mine.filter((booking) => toISODate(new Date(booking.startsAt)) === selected);
  const daySlots = (slots.data ?? [])
    .filter((slot) => toISODate(new Date(slot.startsAt)) === selected)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const holiday = HOLIDAY_BY_DATE.get(selected);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <MonthCalendar
          cursor={cursor}
          selected={selected}
          todayISO={todayISO}
          marks={marks}
          onSelect={setSelected}
          onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          onToday={() => {
            setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
            setSelected(todayISO);
          }}
        />
        {isStudent ? (
          <Field label="Show hours for" htmlFor="calendar-tutor">
            <Select id="calendar-tutor" value={tutorFilter} onChange={(event) => setTutorFilter(event.target.value)}>
              <option value="">Every tutor</option>
              {(tutors.data ?? []).map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <div className="min-w-0 space-y-6">
        <div className="rounded-xl border border-forest/10 bg-white p-5">
          <p className="mb-3 text-sm font-medium text-forest">
            {new Date(`${selected}T00:00:00`).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          {holiday ? (
            <div className="mb-3 rounded-lg bg-mist/60 px-3 py-2">
              <p className="text-xs font-medium text-amber-spice">
                {holiday.name} · {CATEGORY_LABEL[holiday.category]}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-earth/70">{holiday.funFact}</p>
            </div>
          ) : null}

          {bookings.loading || (isStudent && slots.loading) ? (
            <p className="flex items-center gap-1.5 py-2 text-xs text-earth/50">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </p>
          ) : daySessions.length === 0 && daySlots.length === 0 ? (
            <p className="mb-3 text-xs text-earth/50">
              {isStudent
                ? "No sessions scheduled and no open hours this day."
                : "No sessions scheduled yet."}
            </p>
          ) : (
            <ul className="mb-3 space-y-2">
              {daySessions.map((booking) => {
                const other = peopleById.get(user.role === "tutor" ? booking.studentId : booking.tutorId);
                return (
                  <li key={booking.id} className="rounded-lg border border-forest/10 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-forest">{timeRange(booking.startsAt, booking.durationMins)}</p>
                        <p className="text-xs text-earth/55">
                          {booking.focus}
                          {other ? ` · with ${other.name}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-mist px-2 py-1 text-[10px] whitespace-nowrap text-earth/70">
                        {booking.status === "awaiting_payment" ? "Payment due" : booking.status === "completed" ? "Completed" : "Booked"}
                      </span>
                    </div>
                  </li>
                );
              })}
              {daySlots.map((slot) => (
                <OpenSlot
                  key={`${slot.tutorId}-${slot.startsAt}`}
                  slot={slot}
                  tutor={tutorsById.get(slot.tutorId)}
                  student={user}
                />
              ))}
            </ul>
          )}

          {user.role === "tutor" ? (
            <a href="#hours" className="text-xs font-medium text-amber-spice hover:underline">
              + Set the hours you teach
            </a>
          ) : null}
        </div>

        <HolidaysPanel />
      </div>
    </div>
  );
}

function timeRange(startsAt: string, durationMins: number) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMins * 60_000);
  return `${formatTime(start.toISOString())} - ${formatTime(end.toISOString())}`;
}

/** One bookable hour on the chosen day; "Book" opens the details right there. */
function OpenSlot({ slot, tutor, student }: { slot: Slot; tutor?: PublicTutor; student: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const languages = tutor?.languages ?? ["sinhala"];
  const [language, setLanguage] = useState<LanguageCode>(
    languages.includes(student.languages[0]) ? student.languages[0] : languages[0],
  );
  const [focus, setFocus] = useState(focusIdeas[0]);
  const create = useAction(() =>
    api.bookings.create({
      tutorId: slot.tutorId,
      studentId: student.id,
      startsAt: slot.startsAt,
      durationMins: slot.durationMins,
      language,
      focus: focus.trim(),
    }),
  );

  return (
    <li className="rounded-lg border border-forest/10 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-forest">{timeRange(slot.startsAt, slot.durationMins)}</p>
          <p className="text-xs text-earth/55">
            with {tutor?.name ?? "a tutor"}
            {tutor?.hourlyRateUsd ? ` · ${money(tutor.hourlyRateUsd)}/hour` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-mist px-2 py-1 text-[10px] text-fern">Open</span>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-xs font-medium whitespace-nowrap text-amber-spice hover:underline"
          >
            Book
          </button>
        </div>
      </div>
      {open ? (
        <form
          className="mt-2.5 space-y-2.5 border-t border-forest/8 pt-2.5"
          onSubmit={async (event) => {
            event.preventDefault();
            const booking = await create.run();
            // The hour is held while payment is pending; checkout takes it from here.
            if (booking) router.push(`/portal/checkout/${booking.id}`);
          }}
        >
          <div className="grid gap-2.5 sm:grid-cols-[8rem_1fr]">
            <Select
              aria-label="Language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            >
              {languages.map((option) => (
                <option key={option} value={option}>
                  {option === "sinhala" ? "Sinhala" : "Tamil"}
                </option>
              ))}
            </Select>
            <Input
              aria-label="What should the hour cover?"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              list="calendar-focus-ideas"
              placeholder="What should the hour cover?"
            />
            <datalist id="calendar-focus-ideas">
              {focusIdeas.map((idea) => (
                <option key={idea} value={idea} />
              ))}
            </datalist>
          </div>
          {create.error ? <p className="text-xs text-clay-600">{create.error}</p> : null}
          <button
            type="submit"
            disabled={create.pending || !focus.trim()}
            className="flex h-8 items-center gap-1 rounded-md bg-forest px-3 text-xs font-medium text-cream disabled:opacity-60"
          >
            {create.pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Continue to payment
          </button>
        </form>
      ) : null}
    </li>
  );
}

function Schedule({ userId, isTutor }: { userId: string; isTutor: boolean }) {
  const [filter, setFilter] = useState<Filter>("upcoming");
  const bookings = useQuery(() => api.bookings.forUser(userId), [userId]);
  const people = useQuery(() => api.users.directory(), []);

  const cancel = useAction((id: string) => api.bookings.cancel(id));
  const [linking, setLinking] = useState<Booking | null>(null);
  const complete = useAction((id: string) => api.bookings.complete(id));

  if (bookings.loading) return <Loading label="Loading your sessions" />;

  const all = bookings.data ?? [];
  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));

  const matches = (booking: Booking) => {
    if (filter === "all") return true;
    const past = isPast(booking.startsAt);
    return filter === "past" ? past : !past && booking.status !== "cancelled";
  };

  const shown = all
    .filter(matches)
    .sort((a, b) =>
      filter === "past"
        ? b.startsAt.localeCompare(a.startsAt)
        : a.startsAt.localeCompare(b.startsAt),
    );

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["upcoming", "past", "all"] as Filter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm capitalize transition ring-1 ring-inset",
              filter === option
                ? "bg-jade-50 text-jade-700 ring-jade-200"
                : "bg-white text-ink-500 ring-ink-900/10 hover:text-ink-900",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="🗓️" title="Nothing here">
          {filter === "upcoming"
            ? isTutor
              ? "No sessions booked. Publish more hours under “My hours”."
              : "No sessions booked. Head to “Book a lesson” to find an hour."
            : "Nothing matches this filter yet."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((booking) => {
            const otherId = isTutor ? booking.studentId : booking.tutorId;
            const past = isPast(booking.startsAt);

            return (
              <BookingRow
                key={booking.id}
                booking={booking}
                counterpart={byId.get(otherId)}
                actions={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {booking.status === "awaiting_payment" && !isTutor ? (
                      <ButtonLink href={`/portal/checkout/${booking.id}`} size="sm" variant="saffron">
                        Pay now
                      </ButtonLink>
                    ) : null}

                    {booking.status === "confirmed" && !past && booking.meetingUrl ? (
                      <a
                        href={booking.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-jade-700 hover:text-jade-600"
                      >
                        Join link →
                      </a>
                    ) : null}

                    {booking.status === "confirmed" && !past && !booking.meetingUrl && !isTutor ? (
                      <span className="text-xs text-ink-400">Meeting link to follow</span>
                    ) : null}

                    {booking.status === "confirmed" && !past && isTutor ? (
                      <Button size="sm" variant="secondary" onClick={() => setLinking(booking)}>
                        {booking.meetingUrl ? "Change link" : "Add meeting link"}
                      </Button>
                    ) : null}

                    {booking.status === "confirmed" && past && isTutor ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={complete.pending}
                        onClick={() => void complete.run(booking.id)}
                      >
                        Mark complete
                      </Button>
                    ) : null}

                    {(booking.status === "confirmed" ||
                      booking.status === "awaiting_payment") &&
                    !past ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-clay-600 hover:bg-clay-50"
                        disabled={cancel.pending}
                        onClick={() => void cancel.run(booking.id)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {linking ? <MeetingLinkDialog booking={linking} onClose={() => setLinking(null)} /> : null}
    </>
  );
}

function MeetingLinkDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [link, setLink] = useState(booking.meetingUrl ?? "");
  const save = useAction(() => api.bookings.setMeetingLink(booking.id, link));

  return (
    <Modal
      open
      onClose={onClose}
      title={booking.meetingUrl ? "Change the meeting link" : "Add a meeting link"}
      description="Paste a Google Meet (or Zoom) link. The student is emailed as soon as you save."
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await save.run()) onClose();
        }}
      >
        <Field label="Meeting link" htmlFor="meeting-link" hint="Tip: connect Google Calendar under My hours and links are made for you.">
          <Input
            id="meeting-link"
            type="url"
            required
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
          />
        </Field>
        {save.error ? <Alert>{save.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.pending || !link.trim()}>
            {save.pending ? "Saving…" : "Save link"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
