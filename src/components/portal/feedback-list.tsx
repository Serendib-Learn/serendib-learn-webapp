"use client";

import { relativeTime } from "@/lib/format";
import { VoiceNotePlayer } from "./voice-note-player";
import type { LessonPace, PublicProfile, SessionFeedback } from "@/lib/types";

const paceLabel: Record<LessonPace, string> = {
  too_slow: "too slow",
  just_right: "about right",
  too_fast: "too fast",
};

/** Students' feedback on lessons: stars, pace, materials, what next, comment and any voice note. */
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
          {item.pace || item.materialsRating ? (
            <p className="mt-1.5 text-xs text-ink-500">
              {item.pace ? `Pace: ${paceLabel[item.pace]}` : ""}
              {item.pace && item.materialsRating ? " · " : ""}
              {item.materialsRating ? `Materials: ${item.materialsRating}/5` : ""}
            </p>
          ) : null}
          {item.comment ? (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-700">&ldquo;{item.comment}&rdquo;</p>
          ) : null}
          {item.nextFocus ? (
            <p className="mt-1.5 text-sm text-ink-600">
              <span className="font-medium">Next time:</span> {item.nextFocus}
            </p>
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
