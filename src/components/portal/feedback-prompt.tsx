"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { VoiceRecorder, type Recording } from "./voice-recorder";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Avatar } from "@/components/ui/primitives";
import type { PendingFeedback, User } from "@/lib/types";

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
        <Avatar name={next.other.name} avatarId={next.other.avatarId} />
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

function Stars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          className={cn(
            "text-3xl leading-none transition hover:scale-110",
            star <= value ? "text-saffron-400" : "text-ink-900/15",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function FeedbackDialog({ item, onClose }: { item: PendingFeedback; onClose: () => void }) {
  const [rating, setRating] = useState(0);
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
          <Stars value={rating} onChange={setRating} />
        </div>
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
