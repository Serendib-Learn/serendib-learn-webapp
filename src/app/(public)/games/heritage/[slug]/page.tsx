import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { getHeritageSite, heritageSites } from "@/data/heritage";
import { getChapter } from "@/data/vocabulary";

export function generateStaticParams() {
  return heritageSites.map((site) => ({ slug: site.slug }));
}

export async function generateMetadata(
  props: PageProps<"/games/heritage/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const site = getHeritageSite(slug);
  if (!site) return { title: "Site not found" };

  return { title: site.name, description: site.hook };
}

export default async function HeritageSitePage(props: PageProps<"/games/heritage/[slug]">) {
  const { slug } = await props.params;
  const site = getHeritageSite(slug);
  if (!site) notFound();

  const chapter = site.pairedChapter ? getChapter(site.pairedChapter) : undefined;
  const nearby = heritageSites
    .filter((candidate) => candidate.region === site.region && candidate.slug !== site.slug)
    .slice(0, 3);

  return (
    <>
      <section className="bg-weave border-b border-ink-900/8">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-ink-400"
          >
            <Link href="/games" className="transition hover:text-ink-700">
              Games
            </Link>
            <span aria-hidden>/</span>
            <Link href="/games/heritage" className="transition hover:text-ink-700">
              Explore Heritage
            </Link>
            <span aria-hidden>/</span>
            <span className="text-ink-700">{site.name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="clay">{site.region}</Badge>
            <Badge>{site.era}</Badge>
            {site.unesco ? <Badge tone="saffron">UNESCO World Heritage</Badge> : null}
          </div>

          <h1 className="mt-6 text-4xl leading-[1.1] sm:text-5xl">{site.name}</h1>
          {site.alsoKnownAs ? (
            <p className="mt-2 text-base text-ink-400">Also known as {site.alsoKnownAs}</p>
          ) : null}

          {site.sinhala || site.tamil ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              {site.sinhala ? (
                <p className="text-sinhala text-2xl text-ink-700">{site.sinhala}</p>
              ) : null}
              {site.tamil ? (
                <p className="text-tamil text-2xl text-ink-700">{site.tamil}</p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 max-w-2xl font-display text-xl leading-snug text-ink-800">
            {site.hook}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
        <div className="space-y-5">
          {site.story.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-lg leading-relaxed text-ink-700">
              {paragraph}
            </p>
          ))}
        </div>

        {site.meltingPot ? (
          <aside className="mt-12 rounded-2xl bg-clay-50 p-8 ring-1 ring-clay-100">
            <p className="text-xs font-semibold tracking-[0.16em] text-clay-600 uppercase">
              Melting pot
            </p>
            <p className="mt-3 text-lg leading-relaxed text-ink-800">{site.meltingPot}</p>
          </aside>
        ) : null}

        <Card className="mt-12 p-8">
          <h2 className="text-xl">The short version</h2>
          <dl className="mt-5 divide-y divide-ink-900/6">
            {site.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:gap-6">
                <dt className="shrink-0 text-sm font-medium text-ink-400 sm:w-36">{fact.label}</dt>
                <dd className="text-sm leading-relaxed text-ink-700">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {chapter ? (
          <section className="mt-12 rounded-2xl bg-jade-700 p-8 text-sand-100">
            <p className="text-xs font-semibold tracking-[0.16em] text-jade-200 uppercase">
              Say it there
            </p>
            <h2 className="mt-3 text-2xl text-sand-50">
              {chapter.emoji} {chapter.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sand-200/75">{chapter.scene}</p>

            <ul className="mt-6 space-y-3">
              {chapter.phrases.slice(0, 4).map((phrase) => (
                <li
                  key={phrase.n}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-white/10 pb-3"
                >
                  <span className="text-sm text-sand-200/80">{phrase.english}</span>
                  <span className="flex items-baseline gap-4">
                    <span className="text-sinhala text-base text-sand-50">{phrase.sinhala}</span>
                    <span className="text-tamil text-base text-sand-50">{phrase.tamil}</span>
                  </span>
                </li>
              ))}
            </ul>

            <ButtonLink href={`/games/languages/${chapter.id}`} variant="saffron" className="mt-7">
              Play this chapter
            </ButtonLink>
          </section>
        ) : null}

        {nearby.length > 0 ? (
          <section className="mt-14 border-t border-ink-900/10 pt-10">
            <h2 className="text-xl">Also in {site.region}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {nearby.map((other) => (
                <Link
                  key={other.slug}
                  href={`/games/heritage/${other.slug}`}
                  className="group rounded-xl bg-white p-5 ring-1 ring-ink-900/8 transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <p className="font-display text-base leading-snug text-ink-900 transition group-hover:text-jade-700">
                    {other.name}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{other.hook}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12">
          <ButtonLink href="/games/heritage" variant="secondary">
            ← Back to the map
          </ButtonLink>
        </div>
      </article>
    </>
  );
}
