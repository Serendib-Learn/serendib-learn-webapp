import type { Metadata } from "next";
import { HeritageExplorer } from "@/components/games/heritage-explorer";
import { Badge } from "@/components/ui/primitives";
import { heritageSites, meltingPotSites } from "@/data/heritage";

export const metadata: Metadata = {
  title: "Explore Heritage",
  description:
    "Sri Lanka's heritage sites, from Sigiriya and Anuradhapura to Galle Face Green and the streets of Pettah — and why Colombo is a melting pot.",
};

export default function HeritagePage() {
  const colombo = heritageSites.filter((site) => site.region === "Colombo");

  return (
    <>
      <section className="bg-weave border-b border-ink-900/8">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-18">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="saffron">Explore Heritage</Badge>
            <Badge>{heritageSites.length} places</Badge>
            <Badge tone="clay">{colombo.length} in Colombo</Badge>
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-5xl">
            The island, and the city that contains all of it.
          </h1>

          <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-ink-600">
            <p>
              Most heritage lists send you to the Cultural Triangle and treat Colombo as
              the place you land in. That gets it backwards.
            </p>
            <p>
              Galle Face Green, the streets of Pettah, a red-striped mosque, a Dutch
              church on a hill and the oldest Hindu temple in the city all sit within a
              few kilometres of each other — and none of them came from one place. That is
              what Colombo is: {meltingPotSites.length} of the places here are only
              explicable as a meeting of peoples.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <HeritageExplorer />
      </section>
    </>
  );
}
