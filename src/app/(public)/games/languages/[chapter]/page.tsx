import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VocabMission } from "@/components/games/vocab-mission";
import { allChapters, getChapter } from "@/data/vocabulary";
import { heritageSites } from "@/data/heritage";

export function generateStaticParams() {
  return allChapters.map((chapter) => ({ chapter: chapter.id }));
}

export async function generateMetadata(
  props: PageProps<"/games/languages/[chapter]">,
): Promise<Metadata> {
  const { chapter: chapterId } = await props.params;
  const chapter = getChapter(chapterId);
  if (!chapter) return { title: "Chapter not found" };

  return {
    title: `${chapter.title} — Survival Sri Lanka`,
    description: chapter.scene,
  };
}

export default async function ChapterPage(props: PageProps<"/games/languages/[chapter]">) {
  const { chapter: chapterId } = await props.params;
  const chapter = getChapter(chapterId);
  if (!chapter) notFound();

  const index = allChapters.findIndex((candidate) => candidate.id === chapter.id);
  const previous = allChapters[index - 1];
  const next = allChapters[index + 1];
  const pairedSites = heritageSites.filter((site) => site.pairedChapter === chapter.id);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-ink-400">
        <Link href="/games" className="transition hover:text-ink-700">
          Games
        </Link>
        <span aria-hidden>/</span>
        <Link href="/games/languages" className="transition hover:text-ink-700">
          Survival Sri Lanka
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink-700">{chapter.title}</span>
      </nav>

      <VocabMission chapter={chapter} />

      {pairedSites.length > 0 ? (
        <section className="mt-16 rounded-2xl bg-white p-8 ring-1 ring-ink-900/8">
          <h2 className="text-xl">Where you would actually use this</h2>
          <p className="mt-2 text-sm text-ink-500">
            These places pair with {chapter.title.toLowerCase()}.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {pairedSites.map((site) => (
              <Link
                key={site.slug}
                href={`/games/heritage/${site.slug}`}
                className="group rounded-xl bg-sand-100/70 p-5 ring-1 ring-inset ring-ink-900/6 transition hover:bg-saffron-50 hover:ring-saffron-300"
              >
                <p className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                  {site.region}
                </p>
                <p className="mt-1.5 font-display text-lg text-ink-900">{site.name}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{site.hook}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/10 pt-6">
        {previous ? (
          <Link
            href={`/games/languages/${previous.id}`}
            className="text-sm text-ink-500 transition hover:text-ink-900"
          >
            <span className="block text-xs text-ink-300">Previous</span>
            <span aria-hidden>← </span>
            {previous.emoji} {previous.title}
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            href={`/games/languages/${next.id}`}
            className="text-right text-sm text-ink-500 transition hover:text-ink-900"
          >
            <span className="block text-xs text-ink-300">Next</span>
            {next.emoji} {next.title}
            <span aria-hidden> →</span>
          </Link>
        ) : (
          <Link
            href="/games/heritage"
            className="text-right text-sm text-ink-500 transition hover:text-ink-900"
          >
            <span className="block text-xs text-ink-300">Phase 1 complete</span>
            Explore the heritage sites <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
