"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Repeat, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTime, lkr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/primitives";
import type { LanguageCode, PublicTutor, Slot } from "@/lib/types";

/**
 * Booking a bundle on the calendar (server/src/lib/bundles.ts): the student
 * picks 5 or 10 open hours with any tutors, then pays for them all at once.
 */

/** How a student is booking: one lesson at a time, or a bundle of `size`. */
export function BookingModeSwitch({
  sizes,
  size,
  onChange,
}: {
  sizes: number[];
  size: number | null;
  onChange: (size: number | null) => void;
}) {
  const options: { value: number | null; label: string }[] = [
    { value: null, label: "One lesson" },
    ...sizes.map((value) => ({ value, label: `${value} lessons` })),
  ];
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-700">How would you like to book?</p>
      <div className="flex rounded-full border border-forest/10 bg-white p-1" role="radiogroup" aria-label="How would you like to book?">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={size === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
              size === option.value ? "bg-forest text-cream" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One open hour while picking a bundle: add it, or take it out again. */
export function BundleSlot({
  slot,
  tutor,
  picked,
  full,
  clash,
  teaches,
  onToggle,
}: {
  slot: Slot;
  tutor?: PublicTutor;
  picked: boolean;
  /** The bundle already has all its lessons. */
  full: boolean;
  /** Another chosen lesson is at this time. */
  clash: boolean;
  /** The tutor teaches the bundle's language. */
  teaches: boolean;
  onToggle: () => void;
}) {
  const end = new Date(new Date(slot.startsAt).getTime() + slot.durationMins * 60_000).toISOString();
  const why = !teaches ? "Doesn't teach this language" : clash ? "You have one at this time" : full ? "Bundle is full" : null;
  return (
    <li className={cn("rounded-lg border px-3 py-2.5", picked ? "border-jade-300 bg-jade-50/60" : "border-forest/10")}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-forest">
            {formatTime(slot.startsAt)} - {formatTime(end)}
          </p>
          <p className="text-xs text-earth/55">with {tutor?.name ?? "a tutor"}</p>
        </div>
        {picked ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-jade-700 hover:underline"
          >
            <Check className="size-3.5" aria-hidden /> Added
          </button>
        ) : why ? (
          <span className="text-[11px] whitespace-nowrap text-ink-400">{why}</span>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-amber-spice hover:underline"
          >
            <Plus className="size-3.5" aria-hidden /> Add
          </button>
        )}
      </div>
    </li>
  );
}

/** A slot's place in the week, with its tutor, in the viewer's own time: Tuesday 8pm with Dilani. */
export function weekKey(slot: Slot): string {
  const start = new Date(slot.startsAt);
  return `${slot.tutorId}|${start.getDay()}-${start.getHours()}:${start.getMinutes()}`;
}

/** One slot per weekly time (the earliest), in date order: the pattern Repeat weekly follows. */
export function weeklyTimesOf(slots: Slot[]): Slot[] {
  const first = new Map<string, Slot>();
  for (const slot of [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    if (!first.has(weekKey(slot))) first.set(weekKey(slot), slot);
  }
  return [...first.values()];
}

/**
 * "Repeat weekly": the hours already chosen are the pattern (say Tuesday 8pm
 * and Thursday 8pm with one tutor); this adds the same weekday, time and tutor
 * week after week, in date order, until the bundle is full. Weeks the tutor
 * isn't free, or that clash with a chosen lesson, are skipped. Returns the
 * new list, which can be short of `size` if not enough weeks are open.
 */
export function fillWeekly(picked: Slot[], open: Slot[], size: number): Slot[] {
  if (picked.length === 0) return picked;
  const pattern = new Set(picked.map(weekKey));
  const from = Math.min(...picked.map((slot) => new Date(slot.startsAt).getTime()));
  const chosen = [...picked];
  const overlaps = (slot: Slot) => {
    const start = new Date(slot.startsAt).getTime();
    return chosen.some((item) => {
      const other = new Date(item.startsAt).getTime();
      return start < other + item.durationMins * 60_000 && other < start + slot.durationMins * 60_000;
    });
  };
  const candidates = [...open]
    .filter((slot) => new Date(slot.startsAt).getTime() > from && pattern.has(weekKey(slot)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const slot of candidates) {
    if (chosen.length >= size) break;
    if (!overlaps(slot)) chosen.push(slot);
  }
  return chosen;
}

/** The chosen lessons, the total, and the way to payment. */
export function BundleTray({
  size,
  picked,
  tutorsById,
  priceLkr,
  language,
  languages,
  onLanguage,
  focus,
  onFocus,
  onRemove,
  onRepeatWeekly,
  weeklyTimes,
  onRemoveWeeklyTime,
  onStopRepeating,
  repeatNote,
}: {
  size: number;
  picked: Slot[];
  tutorsById: Map<string, PublicTutor>;
  /** One lesson's price, in rupees. */
  priceLkr?: number;
  language: LanguageCode;
  languages: LanguageCode[];
  onLanguage: (language: LanguageCode) => void;
  focus: string;
  onFocus: (focus: string) => void;
  onRemove: (slot: Slot) => void;
  /** Turns the chosen hours into weekly times and fills the bundle with them. */
  onRepeatWeekly: () => Promise<void>;
  /** The weekly times while repeating (null when picking by hand). */
  weeklyTimes: Slot[] | null;
  onRemoveWeeklyTime: (slot: Slot) => void;
  onStopRepeating: () => void;
  /** Why the bundle could not be filled from the weekly times, if it couldn't. */
  repeatNote: string | null;
}) {
  const router = useRouter();
  const repeat = useAction(onRepeatWeekly);
  const create = useAction(() =>
    api.bundles.create(
      picked.map((slot) => ({ tutorId: slot.tutorId, startsAt: slot.startsAt, language, focus: focus.trim() })),
    ),
  );
  const left = size - picked.length;
  const sorted = [...picked].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-forest">Your {size} lessons</h2>
        <p className="text-sm text-ink-500">
          {picked.length} of {size} chosen{priceLkr ? ` · ${lkr(priceLkr * size)} in total` : ""}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sand-100" aria-hidden>
        <div className="h-full rounded-full bg-jade-600 transition-all" style={{ width: `${(picked.length / size) * 100}%` }} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-500">
          Pick a day, then press <strong className="font-medium text-ink-700">Add</strong> on any open hour. Mix tutors
          and days however suits you.
        </p>
      ) : (
        <ul className="divide-y divide-forest/8 text-sm">
          {sorted.map((slot) => (
            <li key={`${slot.tutorId}-${slot.startsAt}`} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="text-ink-800">{formatDateTime(slot.startsAt)}</span>
                <span className="text-ink-400"> · {tutorsById.get(slot.tutorId)?.name ?? "a tutor"}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(slot)}
                aria-label="Remove this lesson"
                className="rounded p-1 text-ink-400 hover:bg-clay-50 hover:text-clay-600"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {weeklyTimes ? (
        <div className="space-y-2.5 rounded-lg bg-mist/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-ink-800">
              <Repeat className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
              Repeating every week
            </p>
            <button type="button" onClick={onStopRepeating} className="text-xs font-medium text-ink-500 hover:text-ink-900">
              Stop repeating
            </button>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {weeklyTimes.map((slot) => (
              <li
                key={`${slot.tutorId}-${slot.startsAt}`}
                className="flex items-center gap-1 rounded-full bg-white py-1 pr-1 pl-3 text-xs text-ink-700 ring-1 ring-forest/10"
              >
                {new Date(slot.startsAt).toLocaleDateString(undefined, { weekday: "long" })}s at {formatTime(slot.startsAt)}
                <span className="text-ink-400"> · {tutorsById.get(slot.tutorId)?.name ?? "a tutor"}</span>
                <button
                  type="button"
                  onClick={() => onRemoveWeeklyTime(slot)}
                  aria-label="Stop repeating this time"
                  className="rounded-full p-0.5 text-ink-400 hover:bg-clay-50 hover:text-clay-600"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-ink-500">
            Want another day too? Press <strong className="font-medium text-ink-700">Add</strong> on an open hour that
            day, and it repeats every week as well.
          </p>
        </div>
      ) : picked.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-mist/60 px-4 py-3">
          <p className="max-w-md text-xs leading-relaxed text-ink-600">
            <strong className="font-medium text-ink-800">Same time every week?</strong> Repeat the times you have
            chosen (say Tuesday and Thursday at 8pm) week after week. You can add more days after.
          </p>
          <Button type="button" variant="secondary" size="sm" disabled={repeat.pending} onClick={() => void repeat.run()}>
            {repeat.pending ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" aria-hidden />}
            Repeat weekly
          </Button>
        </div>
      ) : null}
      {repeatNote ? <Alert tone="saffron">{repeatNote}</Alert> : null}
      {repeat.error ? <Alert>{repeat.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <Field label="Language" htmlFor="bundle-language">
          <Select
            id="bundle-language"
            value={language}
            onChange={(event) => onLanguage(event.target.value as LanguageCode)}
          >
            {languages.map((option) => (
              <option key={option} value={option}>
                {option === "sinhala" ? "Sinhala" : "Tamil"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What would you like to work on?" htmlFor="bundle-focus" hint="Optional. Your tutors see it on every lesson.">
          <Input id="bundle-focus" maxLength={200} value={focus} onChange={(event) => onFocus(event.target.value)} />
        </Field>
      </div>

      {create.error ? <Alert>{create.error}</Alert> : null}
      <Button
        className="w-full"
        variant="forest"
        disabled={left > 0 || create.pending}
        onClick={async () => {
          const made = await create.run();
          if (made) router.push(`/portal/checkout/bundle/${made.bundle.id}`);
        }}
      >
        {create.pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {left > 0 ? `Choose ${left} more` : `Continue to payment${priceLkr ? `: ${lkr(priceLkr * size)}` : ""}`}
      </Button>
      <p className="text-[11px] leading-relaxed text-ink-400">
        One payment for all {size}. Each lesson can be moved or cancelled up to 6 hours before it starts, and you keep it.
      </p>
    </Card>
  );
}
