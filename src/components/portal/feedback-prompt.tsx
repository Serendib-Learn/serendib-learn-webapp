"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { photoUrlFor } from "@/lib/api/public";
import { useAction, useQuery } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { VoiceRecorder, type Recording } from "./voice-recorder";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Avatar } from "@/components/ui/primitives";
import { Stars } from "@/components/ui/stars";
import type { LessonPace, PendingFeedback, ProgressMark, User } from "@/lib/types";

/** A row of pill buttons for picking one of a few answers. */
function Choice<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm ring-1 ring-inset transition",
            value === option.value ? "bg-jade-50 text-jade-700 ring-jade-200" : "bg-white text-ink-500 ring-ink-900/10",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const paceOptions: { value: LessonPace; label: string }[] = [
  { value: "too_slow", label: "Too slow" },
  { value: "just_right", label: "About right" },
  { value: "too_fast", label: "Too fast" },
];

const progressOptions: { value: ProgressMark; label: string }[] = [
  { value: "needs_support", label: "Needs more support" },
  { value: "on_track", label: "On track" },
  { value: "ahead", label: "Ahead" },
];

/** How often the portal checks whether a lesson has just ended. */
const CHECK_EVERY_MS = 60_000;

/**
 * The feedback loop's in-portal half: as soon as a lesson's end time passes,
 * this appears at the top of every portal page — asking the student how it
 * went, and the tutor for their write-up — until it is done. (The email half
 * is the reminder job on the API.)
 */
export function FeedbackPrompt({ user }: { user: User }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  const pending = useQuery(() => api.feedback.pending(), [user.id, tick]);
  const [open, setOpen] = useState<PendingFeedback | null>(null);

  const items = pending.data ?? [];
  if (items.length === 0) return null;
  const next = items[0];
  const isStudent = next.kind === "feedback";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-jade-700 p-5 text-sand-50 shadow-card">
        <Avatar name={next.other.name} avatarId={next.other.avatarId} photoUrl={photoUrlFor(next.other)} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-snug">
            {isStudent
              ? `How was your lesson with ${next.other.name.split(" ")[0]}?`
              : `Write up your lesson with ${next.other.name.split(" ")[0]}`}
          </p>
          <p className="text-xs text-jade-100">
            {formatDateTime(next.booking.startsAt)} · {next.booking.focus}
            {items.length > 1 ? ` · and ${items.length - 1} more waiting` : ""}
          </p>
        </div>
        <Button variant="saffron" size="sm" onClick={() => setOpen(next)}>
          {isStudent ? "Give feedback" : "Write it up"}
        </Button>
      </div>

      {open?.kind === "feedback" ? (
        <FeedbackDialog item={open} onClose={() => setOpen(null)} />
      ) : null}
      {open?.kind === "write-up" ? <WriteUpDialog item={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function FeedbackDialog({ item, onClose }: { item: PendingFeedback; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [pace, setPace] = useState<LessonPace | undefined>();
  const [materialsRating, setMaterialsRating] = useState(0);
  const [nextFocus, setNextFocus] = useState("");
  const [comment, setComment] = useState("");
  const [voice, setVoice] = useState<Recording | null>(null);

  const send = useAction(async () => {
    const note = voice
      ? await api.voiceNotes.upload(item.booking.id, voice.blob, voice.durationSec)
      : null;
    return api.feedback.give({
      bookingId: item.booking.id,
      rating,
      comment: comment.trim(),
      voiceNoteId: note?.id,
      pace,
      materialsRating: materialsRating || undefined,
      nextFocus: nextFocus.trim() || undefined,
    });
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Your lesson with ${item.other.name}`}
      description="Thirty seconds, and it goes straight to your tutor. A voice note is fine instead of typing."
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await send.run()) onClose();
        }}
      >
        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">How did it go?</p>
          <Stars value={rating} onChange={setRating} label="The lesson" />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">The pace</p>
          <Choice options={paceOptions} value={pace} onChange={setPace} label="Pace" />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">
            The materials{" "}
            <span className="font-normal text-ink-400">(if your tutor used any)</span>
          </p>
          <Stars value={materialsRating} onChange={setMaterialsRating} label="Materials" size="md" />
        </div>
        <Field label="What would you like to work on next time?" htmlFor="feedback-next">
          <Input
            id="feedback-next"
            maxLength={500}
            value={nextFocus}
            onChange={(event) => setNextFocus(event.target.value)}
            placeholder="Ordering food, numbers, talking to grandma…"
          />
        </Field>
        <Field label="Anything to add?" htmlFor="feedback-comment">
          <Textarea
            id="feedback-comment"
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What clicked, what didn't, what you want next time."
          />
        </Field>
        <VoiceRecorder value={voice} onChange={setVoice} />
        {send.error ? <Alert>{send.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Later
          </Button>
          <Button type="submit" disabled={send.pending || rating === 0}>
            {send.pending ? "Sending…" : "Send feedback"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function WriteUpDialog({ item, onClose }: { item: PendingFeedback; onClose: () => void }) {
  const [summary, setSummary] = useState("");
  const [wentWell, setWentWell] = useState("");
  const [workOn, setWorkOn] = useState("");
  const [vocab, setVocab] = useState("");
  const [voice, setVoice] = useState<Recording | null>(null);
  const [progress, setProgress] = useState<ProgressMark | undefined>();
  const [engagement, setEngagement] = useState(0);
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  // Materials to point the student at: the tutor's own, and the open library.
  const materials = useQuery(async () => {
    const [own, library] = await Promise.all([
      api.materials.forOwner(item.booking.tutorId),
      api.materials.library(),
    ]);
    const seen = new Set<string>();
    return [...own, ...library].filter((material) => !seen.has(material.id) && seen.add(material.id));
  }, [item.booking.tutorId]);

  const send = useAction(async () => {
    const note = voice
      ? await api.voiceNotes.upload(item.booking.id, voice.blob, voice.durationSec)
      : null;
    return api.lessonNotes.write({
      bookingId: item.booking.id,
      summary: summary.trim(),
      wentWell: wentWell.trim(),
      workOn: workOn.trim(),
      vocabIntroduced: vocab
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean),
      voiceNoteId: note?.id,
      progress,
      engagement: engagement || undefined,
      materialIds,
    });
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Write up: ${item.other.name}`}
      description="Goes to their learning hub and their inbox. Keep it short — a voice note works too."
      className="sm:max-w-xl"
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await send.run()) onClose();
        }}
      >
        <Field label="What you covered" htmlFor="writeup-summary">
          <Textarea
            id="writeup-summary"
            className="min-h-20"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder={item.booking.focus}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What went well" htmlFor="writeup-well">
            <Textarea id="writeup-well" className="min-h-20" value={wentWell} onChange={(event) => setWentWell(event.target.value)} />
          </Field>
          <Field label="What to work on" htmlFor="writeup-workon">
            <Textarea id="writeup-workon" className="min-h-20" value={workOn} onChange={(event) => setWorkOn(event.target.value)} />
          </Field>
        </div>
        <Field label="New words" htmlFor="writeup-vocab" hint="Comma separated, in script or romanised.">
          <Input id="writeup-vocab" value={vocab} onChange={(event) => setVocab(event.target.value)} placeholder="අම්මා, තාත්තා, ආච්චි" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Where they are now</p>
            <Choice options={progressOptions} value={progress} onChange={setProgress} label="Progress" />
            <p className="mt-1.5 text-[11px] text-earth/50">The student sees this.</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">How engaged were they?</p>
            <Stars value={engagement} onChange={setEngagement} label="Engagement" size="md" />
            <p className="mt-1.5 text-[11px] text-earth/50">Only you and the Serendib team see this.</p>
          </div>
        </div>
        {(materials.data ?? []).length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-700">
              Materials you used or recommend{" "}
              <span className="font-normal text-ink-400">— they go to the student&rsquo;s hub</span>
            </legend>
            <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
              {(materials.data ?? []).map((material) => (
                <label key={material.id} className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={materialIds.includes(material.id)}
                    onChange={() =>
                      setMaterialIds((current) =>
                        current.includes(material.id)
                          ? current.filter((id) => id !== material.id)
                          : [...current, material.id],
                      )
                    }
                  />
                  {material.title}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <VoiceRecorder value={voice} onChange={setVoice} />
        {send.error ? <Alert>{send.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Later
          </Button>
          <Button type="submit" disabled={send.pending || !summary.trim()}>
            {send.pending ? "Sending…" : "Send write-up"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
