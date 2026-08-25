"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Badge, Card } from "@/components/ui/primitives";
import {
  heritageRegions,
  heritageSites,
  type HeritageRegion,
  type HeritageSite,
} from "@/data/heritage";

// Bounding box of the island, used to place pins on the stylised map.
const BOUNDS = { minLat: 5.85, maxLat: 9.95, minLng: 79.5, maxLng: 82.0 };

function project(site: HeritageSite) {
  const x = ((site.lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = ((BOUNDS.maxLat - site.lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x, y };
}

const regionTone: Record<HeritageRegion, string> = {
  Colombo: "bg-clay-500",
  "Cultural Triangle": "bg-saffron-500",
  "Hill Country": "bg-jade-500",
  "South Coast": "bg-ocean-500",
  North: "bg-ink-700",
  East: "bg-jade-700",
};

type Filter = HeritageRegion | "all" | "melting-pot";

export function HeritageExplorer() {
  const [filter, setFilter] = useState<Filter>("all");
  const [hovered, setHovered] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return heritageSites;
    if (filter === "melting-pot") return heritageSites.filter((site) => site.meltingPot);
    return heritageSites.filter((site) => site.region === filter);
  }, [filter]);

  const visibleSlugs = new Set(visible.map((site) => site.slug));

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter sites">
        {(
          [
            { value: "all" as Filter, label: `All ${heritageSites.length}` },
            { value: "melting-pot" as Filter, label: "Melting pot" },
            ...heritageRegions.map((region) => ({ value: region as Filter, label: region })),
          ]
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition ring-1 ring-inset",
              filter === option.value
                ? "bg-ink-900 text-sand-50 ring-ink-900"
                : "bg-white text-ink-600 ring-ink-900/10 hover:bg-sand-100 hover:text-ink-900",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[3/4] bg-gradient-to-b from-ocean-100 via-sand-100 to-jade-50">
              {/* Stylised outline of Sri Lanka. */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full"
                aria-hidden
              >
                <path
                  d="M46 4 C57 8 62 16 64 26 C67 36 72 44 72 54 C72 66 66 78 56 88 C50 94 44 97 38 95 C31 93 25 86 22 76 C19 65 20 54 24 44 C28 33 32 22 36 14 C39 8 42 3 46 4 Z"
                  fill="#ffffff"
                  fillOpacity="0.62"
                  stroke="#0d7a63"
                  strokeOpacity="0.35"
                  strokeWidth="0.7"
                />
              </svg>

              {heritageSites.map((site) => {
                const { x, y } = project(site);
                const active = visibleSlugs.has(site.slug);
                const isHovered = hovered === site.slug;

                return (
                  <Link
                    key={site.slug}
                    href={`/games/heritage/${site.slug}`}
                    onMouseEnter={() => setHovered(site.slug)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300",
                      active ? "opacity-100" : "pointer-events-none opacity-20",
                      isHovered ? "z-20 scale-125" : "z-10",
                    )}
                    aria-label={site.name}
                  >
                    <span
                      className={cn(
                        "block size-2.5 rounded-full ring-2 ring-white",
                        regionTone[site.region],
                      )}
                    />
                    {isHovered ? (
                      <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-md bg-ink-900 px-2 py-1 text-[0.68rem] whitespace-nowrap text-sand-50">
                        {site.name}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-ink-900/8 p-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-ink-400 uppercase">
                Regions
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {heritageRegions.map((region) => (
                  <li key={region} className="flex items-center gap-2 text-xs text-ink-600">
                    <span className={cn("size-2 rounded-full", regionTone[region])} />
                    {region}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-ink-400">
                Pins are positioned from real coordinates on a stylised outline, so
                treat it as a diagram rather than a map to navigate by.
              </p>
            </div>
          </Card>
        </div>

        <div>
          <p className="mb-5 text-sm text-ink-500">
            {visible.length} {visible.length === 1 ? "place" : "places"}
            {filter === "melting-pot"
              ? " where more than one culture built the same thing"
              : filter === "all"
                ? ""
                : ` in ${filter}`}
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {visible.map((site) => (
              <Link
                key={site.slug}
                href={`/games/heritage/${site.slug}`}
                onMouseEnter={() => setHovered(site.slug)}
                onMouseLeave={() => setHovered(null)}
                className="group flex flex-col rounded-2xl bg-white p-6 ring-1 ring-ink-900/8 transition hover:-translate-y-0.5 hover:shadow-lifted"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", regionTone[site.region])} />
                  <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                    {site.region}
                  </span>
                  {site.unesco ? <Badge tone="saffron">UNESCO</Badge> : null}
                </div>

                <h2 className="mt-3 text-xl leading-tight transition group-hover:text-jade-700">
                  {site.name}
                </h2>
                {site.alsoKnownAs ? (
                  <p className="mt-0.5 text-xs text-ink-400">{site.alsoKnownAs}</p>
                ) : null}

                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-500">{site.hook}</p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink-900/8 pt-4">
                  <span className="text-xs text-ink-400">{site.era}</span>
                  <div className="flex items-center gap-2">
                    {site.sinhala ? (
                      <span className="text-sinhala text-sm text-ink-500">{site.sinhala}</span>
                    ) : null}
                    {site.tamil ? (
                      <span className="text-tamil text-sm text-ink-500">{site.tamil}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
