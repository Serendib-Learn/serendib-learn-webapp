import type { Metadata } from "next";
import { ChapterMap } from "@/components/games/chapter-map";
import { Badge } from "@/components/ui/primitives";
import { phaseOne, totalPhraseCount } from "@/data/vocabulary";

export const metadata: Metadata = {
  title: "Survival Sri Lanka",
  description:
    "Eight chapters of Sinhala and Tamil phrases, from arriving at the airport to meeting your relatives.",
};

export default function LanguagesPage() {
  return (
    <>
      <section className="bg-weave border-b border-ink-900/8">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-18">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="jade">Phase 1</Badge>
            <Badge>{phaseOne.chapters.length} chapters</Badge>
            <Badge>{totalPhraseCount} phrases</Badge>
          </div>
          <h1 className="mt-6 text-4xl leading-[1.1] sm:text-5xl">{phaseOne.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
            {phaseOne.blurb}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <ChapterMap />
      </section>
    </>
  );
}
