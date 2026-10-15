"use client";

import Link from "next/link";
import { getChapter } from "@/data/vocabulary";
import { MaterialCard } from "./material-card";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { CourseChapter, LanguageCode, Material } from "@/lib/types";

/** Chapters grouped under their stage, stages in the order of their first chapter. */
export function groupByStage(chapters: CourseChapter[]) {
  const stages = new Map<string, CourseChapter[]>();
  for (const chapter of [...chapters].sort((a, b) => a.order - b.order)) {
    const list = stages.get(chapter.stage);
    if (list) list.push(chapter);
    else stages.set(chapter.stage, [chapter]);
  }
  return Array.from(stages, ([stage, items]) => ({ stage, chapters: items }));
}

/**
 * The course, chapter by chapter: each chapter's materials, and — for the
 * Survival Sri Lanka chapters — its phrase list in the learner's language(s),
 * so no chapter is ever empty. The alphabet chapter links the alphabet sheet.
 */
export function ChapterBrowser({
  chapters,
  materials,
  languages,
  footerFor,
}: {
  chapters: CourseChapter[];
  materials: Material[];
  languages: LanguageCode[];
  footerFor?: (material: Material) => React.ReactNode;
}) {
  const known = new Set(chapters.map((chapter) => chapter.id));
  const unfiled = materials.filter((material) => !material.chapterId || !known.has(material.chapterId));
  const shown: LanguageCode[] = languages.length > 0 ? languages : ["sinhala", "tamil"];

  return (
    <div className="space-y-10">
      {groupByStage(chapters).map(({ stage, chapters: items }) => (
        <section key={stage}>
          <h3 className="text-xs font-semibold tracking-[0.18em] text-jade-600 uppercase">{stage}</h3>
          <div className="mt-3 space-y-3">
            {items.map((chapter, index) => {
              const filed = materials.filter((material) => material.chapterId === chapter.id);
              const vocab = chapter.vocabChapterId ? getChapter(chapter.vocabChapterId) : undefined;
              const isAlphabet = chapter.id === "ch_alphabet";
              return (
                <details
                  key={chapter.id}
                  className="group rounded-2xl bg-white border border-forest/10 open:shadow-card"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sand-100 font-display text-sm text-ink-700">
                      {vocab?.emoji ?? index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-base text-ink-900">{chapter.title}</span>
                      {chapter.summary ? (
                        <span className="block truncate text-xs text-ink-500">{chapter.summary}</span>
                      ) : null}
                    </span>
                    {filed.length > 0 ? <Badge tone="jade">{filed.length}</Badge> : null}
                    {vocab ? <Badge>{vocab.phrases.length} phrases</Badge> : null}
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden
                      className="size-4 shrink-0 text-ink-400 transition group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>

                  <div className="space-y-5 border-t border-ink-900/8 px-5 py-5">
                    {isAlphabet ? (
                      <Link
                        href="/alphabet"
                        className="flex items-center justify-between rounded-xl bg-jade-50 px-4 py-3 text-sm font-medium text-jade-700 ring-1 ring-jade-200 hover:bg-jade-100"
                      >
                        Open the alphabet sheet — every letter, its sound, and an example word
                        <span aria-hidden>→</span>
                      </Link>
                    ) : null}

                    {filed.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {filed.map((material) => (
                          <MaterialCard key={material.id} material={material} footer={footerFor?.(material)} />
                        ))}
                      </div>
                    ) : !vocab && !isAlphabet ? (
                      <p className="text-sm text-ink-400">Nothing in this chapter yet.</p>
                    ) : null}

                    {vocab ? <PhraseList chapterId={vocab.id} languages={shown} /> : null}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}

      {unfiled.length > 0 ? (
        <section>
          <h3 className="text-xs font-semibold tracking-[0.18em] text-ink-400 uppercase">Other material</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {unfiled.map((material) => (
              <MaterialCard key={material.id} material={material} footer={footerFor?.(material)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PhraseList({ chapterId, languages }: { chapterId: string; languages: LanguageCode[] }) {
  const chapter = getChapter(chapterId);
  if (!chapter) return null;
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-ink-400">{chapter.scene}</p>
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-900/8 text-[0.7rem] tracking-[0.14em] text-ink-400 uppercase">
            <th className="py-2 pr-4 font-semibold">English</th>
            {languages.map((language) => (
              <th key={language} className="py-2 pr-4 font-semibold">
                {language === "sinhala" ? "Sinhala" : "Tamil"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chapter.phrases.map((phrase) => (
            <tr key={phrase.n} className="border-b border-ink-900/6 align-top last:border-0">
              <td className="py-2.5 pr-4 text-ink-700">
                {phrase.english}
                {phrase.note ? <span className="mt-0.5 block text-xs text-ink-400">{phrase.note}</span> : null}
              </td>
              {languages.map((language) => (
                <td key={language} className="py-2.5 pr-4">
                  <span className={cn("block text-base text-ink-900", language === "sinhala" ? "text-sinhala" : "text-tamil")}>
                    {language === "sinhala" ? phrase.sinhala : phrase.tamil}
                  </span>
                  <span className="text-xs text-ink-500">
                    {language === "sinhala" ? phrase.sinhalaRoman : phrase.tamilRoman}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
