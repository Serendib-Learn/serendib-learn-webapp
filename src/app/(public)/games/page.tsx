import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card } from "@/components/ui/primitives";
import { heritageSites } from "@/data/heritage";
import { allChapters, phaseOne, totalPhraseCount } from "@/data/vocabulary";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Two free ways to learn Sri Lanka — the Survival Sri Lanka phrase decks in Sinhala and Tamil, and a heritage explorer covering the island and Colombo.",
};

export default function GamesPage() {
  const colomboCount = heritageSites.filter((site) => site.region === "Colombo").length;

  return (
    <>
      <section className="border-b border-white/10 bg-jade-700 text-sand-100">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-jade-200">
            Free · No account needed
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.08] text-sand-50 sm:text-5xl lg:text-6xl">
            Learn the island as a story.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand-200/75">
            Two modes. One teaches you the {totalPhraseCount} phrases that get you
            through your first week. The other teaches you where you are standing while
            you say them.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="flex flex-col overflow-hidden p-0">
            <div className="bg-weave border-b border-ink-900/8 p-8">
              <span className="text-4xl" aria-hidden>
                🗣️
              </span>
              <h2 className="mt-5 text-3xl">Learn Languages</h2>
              <p className="mt-2 font-display text-lg text-jade-700">{phaseOne.name}</p>
            </div>

            <div className="flex flex-1 flex-col p-8">
              <p className="leading-relaxed text-ink-600">{phaseOne.blurb}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="jade">Sinhala</Badge>
                <Badge tone="clay">Tamil</Badge>
                <Badge>Script &amp; romanisation</Badge>
                <Badge>{allChapters.length} chapters</Badge>
              </div>

              <ul className="mt-7 space-y-2.5 text-sm text-ink-500">
                <li className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-jade-400" />
                  Study the deck as flashcards, then test yourself
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-jade-400" />
                  Switch between Sinhala and Tamil at any point
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-jade-400" />
                  Scores save to your portal when you are logged in
                </li>
              </ul>

              <Link
                href="/games/languages"
                className="mt-auto pt-8 font-medium text-jade-700 transition hover:text-jade-600"
              >
                Open the chapter map →
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col overflow-hidden p-0">
            <div className="border-b border-ink-900/8 bg-gradient-to-br from-saffron-100 to-clay-50 p-8">
              <span className="text-4xl" aria-hidden>
                🛕
              </span>
              <h2 className="mt-5 text-3xl">Explore Heritage</h2>
              <p className="mt-2 font-display text-lg text-clay-600">
                {heritageSites.length} places worth knowing
              </p>
            </div>

            <div className="flex flex-1 flex-col p-8">
              <p className="leading-relaxed text-ink-600">
                From a fifth-century palace on top of a rock to a bazaar where the clock
                tower was a gift from a Parsi merchant. Every site comes with the story,
                the facts, and the phrases you would use there.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="saffron">Island-wide</Badge>
                <Badge tone="clay">{colomboCount} Colombo sites</Badge>
                <Badge>UNESCO sites</Badge>
                <Badge>Melting pot stories</Badge>
              </div>

              <ul className="mt-7 space-y-2.5 text-sm text-ink-500">
                <li className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-saffron-400" />
                  A stylised map you can filter by region
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-saffron-400" />
                  Colombo treated as the melting pot it is, not a stopover
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-saffron-400" />
                  Each site paired with a phrase chapter
                </li>
              </ul>

              <Link
                href="/games/heritage"
                className="mt-auto pt-8 font-medium text-clay-600 transition hover:text-clay-500"
              >
                Open the map →
              </Link>
            </div>
          </Card>
        </div>

        <div className="mt-16 rounded-2xl border border-dashed border-ink-900/15 bg-sand-100/60 p-8 text-center">
          <p className="font-display text-lg text-ink-900">More phases are being written</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-500">
            Phase 1 gets you through arrival. Phase 2 is about staying — work, renting,
            doctors, and the small talk that turns acquaintances into friends. If there is
            a situation you keep getting stuck in, tell your tutor and it may well end up
            in a chapter.
          </p>
        </div>
      </section>
    </>
  );
}
