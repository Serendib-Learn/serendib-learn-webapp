"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { Badge, Progress } from "@/components/ui/primitives";
import { phaseOne } from "@/data/vocabulary";

export function ChapterMap() {
  const { user } = useAuth();
  const { data: results } = useQuery(
    () => (user ? api.games.resultsFor(user.id) : Promise.resolve([])),
    [user?.id],
  );

  const bestByChapter = new Map<string, number>();
  for (const result of results ?? []) {
    const pct = result.total === 0 ? 0 : Math.round((result.correct / result.total) * 100);
    bestByChapter.set(result.chapterId, Math.max(bestByChapter.get(result.chapterId) ?? 0, pct));
  }

  const attempted = bestByChapter.size;
  const totalChapters = phaseOne.chapters.length;

  return (
    <div>
      {user ? (
        <div className="mb-10 rounded-2xl bg-white p-6 ring-1 ring-ink-900/8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-lg text-ink-900">Your progress</p>
              <p className="mt-1 text-sm text-ink-500">
                {attempted} of {totalChapters} chapters attempted
                {attempted > 0
                  ? ` · best average ${Math.round(
                      Array.from(bestByChapter.values()).reduce((a, b) => a + b, 0) / attempted,
                    )}%`
                  : ""}
              </p>
            </div>
            <Link href="/portal" className="text-sm font-medium text-jade-700 hover:text-jade-600">
              See it in your portal →
            </Link>
          </div>
          <Progress value={attempted} max={totalChapters} className="mt-4" />
        </div>
      ) : (
        <div className="mb-10 rounded-2xl border border-dashed border-ink-900/15 bg-sand-100/60 px-6 py-5 text-sm text-ink-500">
          Playing as a guest — scores are not saved.{" "}
          <Link
            href="/portal/login"
            className="font-medium text-jade-700 underline decoration-jade-300 underline-offset-4"
          >
            Log in
          </Link>{" "}
          to keep track of them, or just carry on.
        </div>
      )}

      <ol className="relative space-y-4">
        <span
          aria-hidden
          className="absolute top-8 bottom-8 left-6 hidden w-px bg-gradient-to-b from-jade-200 via-saffron-300 to-clay-100 sm:block"
        />

        {phaseOne.chapters.map((chapter) => {
          const best = bestByChapter.get(chapter.id);
          const mastered = typeof best === "number" && best >= 80;

          return (
            <li key={chapter.id} className="relative">
              <Link
                href={`/games/languages/${chapter.id}`}
                className="group flex items-start gap-4 rounded-2xl bg-white p-6 ring-1 ring-ink-900/8 transition hover:-translate-y-0.5 hover:shadow-lifted sm:gap-6 sm:pl-6"
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 grid size-12 shrink-0 place-items-center rounded-full text-xl ring-4 ring-sand-50 transition",
                    mastered ? "bg-jade-500 text-white" : "bg-sand-100 group-hover:bg-saffron-100",
                  )}
                >
                  {mastered ? (
                    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    chapter.emoji
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-xs font-semibold tracking-[0.16em] text-ink-300 uppercase">
                      Chapter {chapter.number}
                    </span>
                    {typeof best === "number" ? (
                      <Badge tone={mastered ? "jade" : "saffron"}>Best {best}%</Badge>
                    ) : null}
                  </div>

                  <h2 className="mt-1.5 text-xl transition group-hover:text-jade-700">
                    {chapter.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{chapter.scene}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-400">
                    <span>{chapter.phrases.length} phrases</span>
                    <span aria-hidden>·</span>
                    <span className="text-sinhala text-sm text-ink-600">
                      {chapter.phrases[0].sinhala}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="text-tamil text-sm text-ink-600">
                      {chapter.phrases[0].tamil}
                    </span>
                  </div>
                </div>

                <span
                  aria-hidden
                  className="mt-1 hidden text-ink-300 transition group-hover:translate-x-1 group-hover:text-jade-600 sm:block"
                >
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
