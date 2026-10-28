"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useQuery } from "@/lib/hooks";

/**
 * A rotating card of phrases (parked with the decks — not on any page now).
 * The phrases come from the database: the first phrase of the first five
 * phrase lists.
 */
export function PhraseCardStack() {
  const lists = useQuery(() => api.content.list("phrase-lists"), []);
  const featured = (lists.data ?? [])
    .filter((list) => list.phrases.length > 0)
    .slice(0, 5)
    .map((list) => ({ phrase: list.phrases[0], chapterTitle: list.title, emoji: list.emoji }));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const count = featured.length;
    if (count === 0) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 3800);
    return () => clearInterval(timer);
  }, [paused, featured.length]);

  const active = featured[index % Math.max(featured.length, 1)];
  if (!active) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="absolute inset-x-6 -bottom-3 h-full rounded-3xl bg-jade-600/12"
      />
      <div
        aria-hidden
        className="absolute inset-x-3 -bottom-1.5 h-full rounded-3xl bg-saffron-400/25"
      />

      <div className="relative rounded-3xl bg-white p-7 shadow-lifted border border-forest/10">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-medium text-ink-600">
            <span aria-hidden>{active.emoji}</span>
            {active.chapterTitle}
          </span>
          <span className="text-xs text-ink-300">Phase 1</span>
        </div>

        <p key={`${index}-en`} className="mt-6 animate-fade font-display text-2xl text-ink-900">
          {active.phrase.english}
        </p>

        <div className="mt-6 space-y-4">
          <div key={`${index}-si`} className="animate-rise">
            <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-jade-600 uppercase">
              Sinhala
            </p>
            <p className="text-sinhala mt-1 text-2xl leading-snug text-ink-900">
              {active.phrase.sinhala}
            </p>
            <p className="text-sm text-ink-500">{active.phrase.sinhalaRoman}</p>
          </div>

          <div key={`${index}-ta`} className="animate-rise">
            <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-clay-500 uppercase">
              Tamil
            </p>
            <p className="text-tamil mt-1 text-2xl leading-snug text-ink-900">
              {active.phrase.tamil}
            </p>
            <p className="text-sm text-ink-500">{active.phrase.tamilRoman}</p>
          </div>
        </div>

        <div className="mt-7 flex items-center gap-1.5">
          {featured.map((item, itemIndex) => (
            <button
              key={item.phrase.english + itemIndex}
              type="button"
              aria-label={`Show ${item.phrase.english}`}
              onClick={() => setIndex(itemIndex)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                itemIndex === index ? "w-7 bg-jade-500" : "w-1.5 bg-ink-900/15 hover:bg-ink-900/30",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
