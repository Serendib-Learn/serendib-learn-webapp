"use client";

import { relativeTime } from "@/lib/format";
import { VoiceNotePlayer } from "./voice-note-player";
import type { PublicProfile, SessionFeedback } from "@/lib/types";

/** Students' feedback on lessons: stars, comment, and any voice note. */
export function FeedbackList({
  items,
  people,
  show = "student",
}: {
  items: SessionFeedback[];
  people: Map<string, PublicProfile>;
  /** Whose name to put on each entry. Admins see both. */
  show?: "student" | "both";
}) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl bg-sand-100/70 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-saffron-500" aria-label={`${item.rating} out of 5`}>
              {"★".repeat(item.rating)}
              <span className="text-ink-900/15">{"★".repeat(5 - item.rating)}</span>
            </span>
            <span className="text-xs text-ink-400">{relativeTime(item.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {people.get(item.studentId)?.name ?? "A student"}
            {show === "both" ? ` → ${people.get(item.tutorId)?.name ?? "a tutor"}` : ""}
          </p>
          {item.comment ? (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-700">&ldquo;{item.comment}&rdquo;</p>
          ) : null}
          {item.voiceNoteId ? (
            <div className="mt-2">
              <VoiceNotePlayer id={item.voiceNoteId} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
