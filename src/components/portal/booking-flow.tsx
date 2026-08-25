"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { formatLongDate, formatTime, groupByDay, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  Loading,
} from "@/components/ui/primitives";
import type { Booking, LanguageCode, Slot, User } from "@/lib/types";

const focusIdeas = [
  "Survival phrases for a Colombo trip",
  "Greetings and family words",
  "Reading the Sinhala alphabet",
  "Tamil pronunciation drill",
  "Ordering food and haggling at a market",
  "Talking to relatives on the phone",
];

export function BookingFlow({ student }: { student: User }) {
  const tutors = useQuery(() => api.users.tutors(), []);
  const [tutorId, setTutorId] = useState<string>("");
  const [slot, setSlot] = useState<Slot | null>(null);

  const selected = (tutors.data ?? []).find((tutor) => tutor.id === tutorId);
  const slots = useQuery(
    () => (tutorId ? api.availability.openSlots(tutorId) : Promise.resolve([])),
    [tutorId],
  );

  if (tutors.loading) return <Loading label="Finding tutors" />;

  const available = tutors.data ?? [];

  if (available.length === 0) {
    return (
      <EmptyState icon="🧑‍🏫" title="No tutors yet">
        Tutors appear here once they join and publish their hours.
      </EmptyState>
    );
  }

  return (
    <>
      <section>
        <h2 className="text-xl">1. Choose a tutor</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {available.map((tutor) => {
            const active = tutor.id === tutorId;
            return (
              <button
                key={tutor.id}
                type="button"
                onClick={() => {
                  setTutorId(tutor.id);
                  setSlot(null);
                }}
                className={cn(
                  "rounded-2xl bg-white p-5 text-left ring-1 transition",
                  active
                    ? "ring-2 ring-jade-500 shadow-lifted"
                    : "ring-ink-900/8 hover:shadow-card",
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={tutor.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base text-ink-900">{tutor.name}</p>
                    <p className="text-xs text-ink-400">
                      {tutor.homeTown ? `${tutor.homeTown} · ` : ""}
                      {money(tutor.hourlyRateUsd ?? 25)}/hour
                    </p>
                  </div>
                </div>

                {tutor.headline ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-500">{tutor.headline}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tutor.languages.map((language) => (
                    <Badge key={language} tone={language === "sinhala" ? "jade" : "clay"}>
                      {language === "sinhala" ? "Sinhala" : "Tamil"}
                    </Badge>
                  ))}
                  {tutor.yearsTeaching ? (
                    <Badge>{tutor.yearsTeaching} yrs teaching</Badge>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <section className="mt-10">
          <h2 className="text-xl">2. Pick an hour with {selected.name.split(" ")[0]}</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Times are shown in your timezone ({student.timezone}). Sessions run 60 minutes.
          </p>

          {slots.loading ? (
            <Loading label="Checking the calendar" />
          ) : (slots.data ?? []).length === 0 ? (
            <div className="mt-4">
              <EmptyState icon="🕰️" title="No open hours in the next two weeks">
                {selected.name} has not published availability yet. Send them a message and
                they can open a slot.
              </EmptyState>
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {groupByDay(slots.data ?? [], (candidate) => candidate.startsAt).map((day) => (
                <div key={day.label}>
                  <h3 className="text-sm font-semibold text-ink-700">{day.label}</h3>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {day.entries.map((candidate) => {
                      const active = slot?.startsAt === candidate.startsAt;
                      return (
                        <button
                          key={candidate.startsAt}
                          type="button"
                          onClick={() => setSlot(candidate)}
                          className={cn(
                            "rounded-full px-4 py-2 text-sm transition ring-1 ring-inset",
                            active
                              ? "bg-ink-900 text-sand-50 ring-ink-900"
                              : "bg-white text-ink-700 ring-ink-900/12 hover:ring-ink-900/30",
                          )}
                        >
                          {formatTime(candidate.startsAt)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {selected && slot ? (
        <BookingDetails
          student={student}
          tutor={selected}
          slot={slot}
          onDone={() => setSlot(null)}
        />
      ) : null}
    </>
  );
}

function BookingDetails({
  student,
  tutor,
  slot,
  onDone,
}: {
  student: User;
  tutor: User;
  slot: Slot;
  onDone: () => void;
}) {
  const [language, setLanguage] = useState<LanguageCode>(
    tutor.languages.includes(student.languages[0]) ? student.languages[0] : tutor.languages[0],
  );
  const [focus, setFocus] = useState(focusIdeas[0]);
  const [checkout, setCheckout] = useState<Booking | null>(null);

  const create = useAction(() =>
    api.bookings.create({
      tutorId: tutor.id,
      studentId: student.id,
      startsAt: slot.startsAt,
      durationMins: slot.durationMins,
      language,
      focus: focus.trim(),
    }),
  );

  return (
    <section className="mt-10">
      <h2 className="text-xl">3. What should the hour cover?</h2>

      <Card className="mt-4 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Language" htmlFor="booking-language">
            <Select
              id="booking-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            >
              {tutor.languages.map((option) => (
                <option key={option} value={option}>
                  {option === "sinhala" ? "Sinhala" : "Tamil"}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="When" htmlFor="booking-when">
            <Input
              id="booking-when"
              readOnly
              value={`${formatLongDate(slot.startsAt)}, ${formatTime(slot.startsAt)}`}
            />
          </Field>
        </div>

        <Field
          label="Focus for the session"
          htmlFor="booking-focus"
          hint="Your tutor sees this before the lesson and prepares around it."
          className="mt-5"
        >
          <Input
            id="booking-focus"
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            list="focus-ideas"
            placeholder="What do you want to walk away with?"
          />
        </Field>
        <datalist id="focus-ideas">
          {focusIdeas.map((idea) => (
            <option key={idea} value={idea} />
          ))}
        </datalist>

        {create.error ? (
          <div className="mt-4">
            <Alert>{create.error}</Alert>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink-500">
            {money(tutor.hourlyRateUsd ?? 25)} for {slot.durationMins} minutes
          </p>
          <Button
            disabled={create.pending || focus.trim().length === 0}
            onClick={async () => {
              const booking = await create.run();
              if (booking) setCheckout(booking);
            }}
          >
            {create.pending ? "Holding the slot…" : "Continue to payment"}
          </Button>
        </div>
      </Card>

      {checkout ? (
        <Checkout
          booking={checkout}
          tutor={tutor}
          onClose={() => {
            setCheckout(null);
            onDone();
          }}
        />
      ) : null}
    </section>
  );
}

function Checkout({
  booking,
  tutor,
  onClose,
}: {
  booking: Booking;
  tutor: User;
  onClose: () => void;
}) {
  const [paid, setPaid] = useState(false);
  const pay = useAction(() => api.bookings.pay(booking.id));
  const cancel = useAction(() => api.bookings.cancel(booking.id));

  return (
    <Modal
      open
      title={paid ? "You're booked" : "Checkout"}
      onClose={() => {
        if (!paid && !pay.pending) void cancel.run();
        onClose();
      }}
    >
      {paid ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            Payment went through and your receipt is in the demo inbox. The meeting link
            now sits on the booking in your calendar.
          </p>
          <Alert tone="jade">
            {formatLongDate(booking.startsAt)} at {formatTime(booking.startsAt)} with{" "}
            {tutor.name}.
          </Alert>
          <Button className="w-full" onClick={onClose}>
            Back to the calendar
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl bg-sand-100 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-500">Session</span>
              <span className="text-ink-800">{booking.durationMins} min with {tutor.name}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-ink-500">When</span>
              <span className="text-ink-800">
                {formatLongDate(booking.startsAt)}, {formatTime(booking.startsAt)}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-ink-900/10 pt-1.5 font-medium">
              <span className="text-ink-700">Total</span>
              <span className="text-ink-900">{money(booking.priceUsd)}</span>
            </div>
          </div>

          <Alert tone="saffron">
            This is a demo checkout. No card details are collected and nothing is charged.
          </Alert>

          {pay.error ? <Alert>{pay.error}</Alert> : null}

          <Button
            className="w-full"
            disabled={pay.pending}
            onClick={async () => {
              const result = await pay.run();
              if (result) setPaid(true);
            }}
          >
            {pay.pending ? "Processing…" : `Pay ${money(booking.priceUsd)}`}
          </Button>
          <p className="text-center text-xs text-ink-400">
            Closing this window releases the slot.
          </p>
        </div>
      )}
    </Modal>
  );
}
