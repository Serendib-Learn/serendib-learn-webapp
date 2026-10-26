"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Badge, EmptyState, Loading } from "@/components/ui/primitives";
import { Stars, StarsShown } from "@/components/ui/stars";
import { cn } from "@/lib/cn";
import type {
  Material,
  MaterialFeedback,
  MaterialFeedbackSummary,
  MaterialLevelFit,
  User,
} from "@/lib/types";

const levelLabel: Record<MaterialLevelFit, string> = {
  too_easy: "Too easy",
  just_right: "About right",
  too_hard: "Too hard",
};

/**
 * "Rate this" on a material, for a student or a tutor who did not make it.
 * Students say how helpful it was and whether the level suited them; tutors
 * say how well it works in a lesson and what would make it better.
 */
export function RateMaterialButton({
  material,
  viewer,
  mine,
}: {
  material: Material;
  viewer: User;
  mine?: MaterialFeedback;
}) {
  const [open, setOpen] = useState(false);
  if (viewer.role !== "student" && viewer.role !== "tutor") return null;
  if (material.ownerId === viewer.id) return null;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {mine ? (
          <>
            Your rating <StarsShown value={mine.rating} className="ml-1" />
          </>
        ) : (
          "Rate this"
        )}
      </Button>
      {open ? (
        <RateMaterialDialog material={material} viewer={viewer} mine={mine} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function RateMaterialDialog({
  material,
  viewer,
  mine,
  onClose,
}: {
  material: Material;
  viewer: User;
  mine?: MaterialFeedback;
  onClose: () => void;
}) {
  const isStudent = viewer.role === "student";
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [level, setLevel] = useState<MaterialLevelFit | undefined>(mine?.level);
  const [suggestion, setSuggestion] = useState(mine?.suggestion ?? "");
  const [comment, setComment] = useState(mine?.comment ?? "");
  const save = useAction(() =>
    api.materials.giveFeedback(material.id, {
      rating,
      comment: comment.trim(),
      ...(isStudent ? { level } : { suggestion: suggestion.trim() || undefined }),
    }),
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={material.title}
      description={
        isStudent
          ? "Tell your tutor whether this helped. Only they and the Serendib team see it."
          : "Your view as a teacher, for whoever made it and the Serendib team."
      }
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await save.run()) onClose();
        }}
      >
        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">
            {isStudent ? "How helpful was it?" : "How well does it work in a lesson?"}
          </p>
          <Stars value={rating} onChange={setRating} label={isStudent ? "Helpfulness" : "Works in lessons"} />
        </div>

        {isStudent ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Was the level right for you?</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(levelLabel) as MaterialLevelFit[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLevel(option)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm ring-1 ring-inset transition",
                    level === option ? "bg-jade-50 text-jade-700 ring-jade-200" : "bg-white text-ink-500 ring-ink-900/10",
                  )}
                >
                  {levelLabel[option]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Field label="What would make it better?" htmlFor="material-suggestion">
            <Textarea
              id="material-suggestion"
              className="min-h-20"
              maxLength={1000}
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
              placeholder="A slower recording, a romanised version, more examples…"
            />
          </Field>
        )}

        <Field label="Anything else?" htmlFor="material-comment">
          <Textarea
            id="material-comment"
            className="min-h-20"
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </Field>

        {save.error ? <Alert>{save.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.pending || rating === 0}>
            {save.pending ? "Saving…" : mine ? "Update feedback" : "Send feedback"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** On the owner's own material: the average, and everyone's feedback on click. */
export function MaterialRatings({ material, summary }: { material: Material; summary?: MaterialFeedbackSummary }) {
  const [open, setOpen] = useState(false);
  if (!summary) return <span className="text-xs text-ink-400">No feedback yet</span>;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <StarsShown value={summary.average} className="mr-1" /> {summary.average} · {summary.count}
      </Button>
      {open ? (
        <Modal open onClose={() => setOpen(false)} title={`Feedback: ${material.title}`} className="sm:max-w-xl">
          <FeedbackEntries materialId={material.id} />
        </Modal>
      ) : null}
    </>
  );
}

function FeedbackEntries({ materialId }: { materialId: string }) {
  const entries = useQuery(() => api.materials.feedbackFor(materialId), [materialId]);
  const people = useQuery(() => api.users.directory(), []);
  if (entries.loading) return <Loading label="Loading feedback" />;
  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));

  if ((entries.data ?? []).length === 0) {
    return <EmptyState icon="💬" title="No feedback yet">Nobody has rated this material yet.</EmptyState>;
  }

  return (
    <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
      {(entries.data ?? []).map((entry) => (
        <li key={entry.id} className="rounded-lg border border-forest/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink-800">{byId.get(entry.authorId)?.name ?? "A former member"}</p>
            <Badge tone={entry.authorRole === "student" ? "jade" : "ocean"}>
              {entry.authorRole === "student" ? "Student" : "Tutor"}
            </Badge>
            <StarsShown value={entry.rating} />
            {entry.level ? <Badge>{levelLabel[entry.level]}</Badge> : null}
            <span className="text-xs text-ink-400">{relativeTime(entry.updatedAt)}</span>
          </div>
          {entry.suggestion ? (
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium">Suggestion:</span> {entry.suggestion}
            </p>
          ) : null}
          {entry.comment ? <p className="mt-1.5 text-sm leading-relaxed text-ink-600">&ldquo;{entry.comment}&rdquo;</p> : null}
        </li>
      ))}
    </ul>
  );
}
