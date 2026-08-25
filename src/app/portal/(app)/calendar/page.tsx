"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { isPast } from "@/lib/format";
import { AvailabilityEditor } from "@/components/portal/availability-editor";
import { BookingFlow } from "@/components/portal/booking-flow";
import { BookingRow } from "@/components/portal/booking-row";
import { GoogleCalendarConnect } from "@/components/portal/google-calendar-connect";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Loading } from "@/components/ui/primitives";
import type { Booking } from "@/lib/types";

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
  const { user } = useAuth();
  const [tab, setTab] = useState<"schedule" | "book" | "hours">("schedule");

  if (!user) return <Loading />;

  const isTutor = user.role === "tutor";
  const secondary = isTutor
    ? { id: "hours" as const, label: "My hours" }
    : { id: "book" as const, label: "Book a lesson" };

  return (
    <>
      <PageHeader title="Calendar">
        {isTutor
          ? "Publish the hours you can teach and keep an eye on what is booked."
          : "Book an hour with a tutor and manage the sessions you already have."}
      </PageHeader>

      {isTutor ? (
        <Suspense fallback={null}>
          <GoogleConnectBanner />
        </Suspense>
      ) : null}

      <div className="mb-6 flex gap-1 rounded-full bg-white p-1 ring-1 ring-ink-900/8 sm:w-fit">
        {[{ id: "schedule" as const, label: "Schedule" }, secondary].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex-1 rounded-full px-5 py-2 text-sm font-medium transition sm:flex-none",
              tab === item.id
                ? "bg-ink-900 text-sand-50"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "schedule" ? <Schedule userId={user.id} isTutor={isTutor} /> : null}
      {tab === "book" ? <BookingFlow student={user} /> : null}
      {tab === "hours" ? (
        <div className="space-y-6">
          <GoogleCalendarConnect />
          <AvailabilityEditor tutorId={user.id} />
        </div>
      ) : null}
    </>
  );
}

function Schedule({ userId, isTutor }: { userId: string; isTutor: boolean }) {
  const [filter, setFilter] = useState<Filter>("upcoming");
  const bookings = useQuery(() => api.bookings.forUser(userId), [userId]);
  const people = useQuery(() => api.users.directory(), []);

  const pay = useAction((id: string) => api.bookings.pay(id));
  const cancel = useAction((id: string) => api.bookings.cancel(id));
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
                      <Button
                        size="sm"
                        variant="saffron"
                        disabled={pay.pending}
                        onClick={() => void pay.run(booking.id)}
                      >
                        Pay now
                      </Button>
                    ) : null}

                    {booking.status === "confirmed" && !past && booking.meetingUrl ? (
                      <a
                        href={booking.meetingUrl}
                        className="text-sm font-medium text-jade-700 hover:text-jade-600"
                      >
                        Join link →
                      </a>
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
    </>
  );
}
