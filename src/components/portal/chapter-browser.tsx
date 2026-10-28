"use client";

import { ArrowUpRight, ChevronDown, FileText, FolderOpen, Volume2 } from "lucide-react";
import Link from "next/link";
import { MaterialCard } from "./material-card";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useQuery } from "@/lib/hooks";
import type { AlphabetSheet, CourseChapter, LanguageCode, Material, PhraseList } from "@/lib/types";

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

/** One of the original learning hub's folders: a white card that opens. */
function Folder({
  icon,
  title,
  description,
  count,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group overflow-hidden rounded-xl border border-forest/10 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-mist/40">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-amber-spice">{icon}</span>
          <div className="min-w-0">
            <p className="font-display text-[15px] text-forest">{title}</p>
            <p className="truncate text-xs text-earth/55">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count ? <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] text-fern">{count}</span> : null}
          <ChevronDown className="h-4 w-4 text-earth/40 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="space-y-3 px-5 pt-1 pb-5">{children}</div>
    </details>
  );
}

/** The original hub's Alphabet folder, pointing at the alphabet sheets (from the database). */
function AlphabetFolder({ sheets }: { sheets: AlphabetSheet[] }) {
  return (
    <Folder
      icon={<Volume2 className="h-4 w-4" strokeWidth={1.75} />}
      title="Alphabet"
      description="Sinhala and Tamil scripts, with a sound for every letter."
      defaultOpen
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {sheets.map((sheet) => ({
          href: `/alphabet?script=${sheet.id}`,
          title: `${sheet.name} alphabet${sheet.native ? ` · ${sheet.native}` : ""}`,
          note: `${sheet.groups.reduce((sum, group) => sum + group.letters.length, 0)} letters, each with its sound`,
        })).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between gap-2 rounded-lg border border-forest/10 px-4 py-3 transition-colors hover:border-amber-spice/50"
          >
            <div>
              <p className="text-sm font-medium text-forest">{item.title}</p>
              <p className="text-xs text-earth/55">{item.note}</p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-amber-spice" />
          </Link>
        ))}
      </div>
    </Folder>
  );
}

/**
 * The course, folder by folder as on the original site's learning hub: the
 * alphabet, then one folder per stage holding its chapters. Each chapter
 * shows its materials and — for the Survival Sri Lanka chapters — its phrase
 * list in the learner's language(s), so no chapter is ever empty.
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
  // Teaching content, all from the database.
  const lists = useQuery(() => api.content.list("phrase-lists"), []);
  const stages = useQuery(() => api.content.list("stages"), []);
  const sheets = useQuery(() => api.content.list("alphabet"), []);
  const listById = new Map((lists.data ?? []).map((list) => [list.id, list]));
  const stageByName = new Map((stages.data ?? []).map((stage) => [stage.name, stage]));

  const known = new Set(chapters.map((chapter) => chapter.id));
  const unfiled = materials.filter((material) => !material.chapterId || !known.has(material.chapterId));
  const shown: LanguageCode[] = languages.length > 0 ? languages : ["sinhala", "tamil"];

  return (
    <div className="space-y-3">
      <AlphabetFolder sheets={sheets.data ?? []} />

      {groupByStage(chapters).map(({ stage, chapters: items }) => {
        const inStage = materials.filter((material) => items.some((chapter) => chapter.id === material.chapterId));
        return (
          <Folder
            key={stage}
            icon={<FolderOpen className="h-4 w-4" strokeWidth={1.75} />}
            title={stage}
            description={stageByName.get(stage)?.description || items.map((chapter) => chapter.title).join(", ")}
            count={inStage.length}
          >
            {items.map((chapter) => {
              const filed = materials.filter((material) => material.chapterId === chapter.id);
              const vocab = chapter.vocabChapterId ? listById.get(chapter.vocabChapterId) : undefined;
              const isAlphabet = chapter.id === "ch_alphabet";
              return (
                <details key={chapter.id} className="group/chapter rounded-lg border border-forest/10">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-forest">
                        {vocab ? `${vocab.emoji} ` : ""}
                        {chapter.title}
                      </span>
                      {chapter.summary ? <span className="block truncate text-xs text-earth/55">{chapter.summary}</span> : null}
                    </span>
                    {filed.length > 0 ? (
                      <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] text-fern">{filed.length}</span>
                    ) : null}
                    {vocab ? <span className="text-[10px] text-earth/45">{vocab.phrases.length} phrases</span> : null}
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-earth/40 transition-transform group-open/chapter:rotate-180" />
                  </summary>

                  <div className="space-y-4 border-t border-forest/8 px-4 py-4">
                    {isAlphabet ? (
                      <Link href="/alphabet" className="text-sm font-medium text-amber-spice hover:underline">
                        Open the alphabet sheet →
                      </Link>
                    ) : null}

                    {filed.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filed.map((material) => (
                          <MaterialCard key={material.id} material={material} footer={footerFor?.(material)} />
                        ))}
                      </div>
                    ) : !vocab && !isAlphabet ? (
                      <p className="text-xs text-earth/50">Nothing in this chapter yet.</p>
                    ) : null}

                    {vocab ? <PhraseTable list={vocab} languages={shown} /> : null}
                  </div>
                </details>
              );
            })}
          </Folder>
        );
      })}

      {unfiled.length > 0 ? (
        <Folder
          icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
          title="Other material"
          description="Shared with you, not filed under a chapter yet."
          count={unfiled.length}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {unfiled.map((material) => (
              <MaterialCard key={material.id} material={material} footer={footerFor?.(material)} />
            ))}
          </div>
        </Folder>
      ) : null}
    </div>
  );
}

function PhraseTable({ list: chapter, languages }: { list: PhraseList; languages: LanguageCode[] }) {
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
