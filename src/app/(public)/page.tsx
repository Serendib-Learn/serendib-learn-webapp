// GAMES-HIDDEN: Link is only used by the commented-out games section below.
// import Link from "next/link";
// Decks are off the landing page for now. The component is kept for later.
// import { PhraseCardStack } from "@/components/home/phrase-card-stack";
import { WaitlistForm } from "@/components/home/waitlist-form";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Card, SectionHeading } from "@/components/ui/primitives";
// GAMES-HIDDEN: deck and heritage counts, used only by commented-out sections.
// import { allChapters, totalPhraseCount } from "@/data/vocabulary";
// import { heritageSites } from "@/data/heritage";
import { fetchPublicTutors } from "@/lib/api/public";

const steps = [
  {
    number: "01",
    title: "Tell us why you're learning",
    body: "A wedding, a move, a grandmother, a passport application. The reason decides the vocabulary, so we ask first.",
  },
  {
    number: "02",
    title: "Book a tutor who fits",
    body: "Pick from real availability in your own timezone, pay for the session, and get a link. No packages, no lock-in.",
  },
  {
    number: "03",
    title: "Practise between lessons",
    body: "Your tutor leaves material and homework in your hub, chapter by chapter, and the community gives you people to practise with on the days you have no lesson.",
  },
];

const reasons = [
  {
    emoji: "🇱🇰",
    title: "Tutors who actually live there",
    body: "Everyone teaching here grew up speaking the language in Sri Lanka. You get the phrasing people use, not the phrasing textbooks prefer.",
  },
  {
    emoji: "⚖️",
    title: "Both languages, no favourites",
    body: "Sinhala and Tamil, taught with equal care and side by side. Every phrase in our decks carries both, in script and in romanisation.",
  },
  {
    emoji: "👋",
    title: "Built for heritage learners",
    body: "Most of our students understand more than they can say. We start by getting the words out of your head and into your mouth.",
  },
  {
    emoji: "🗂️",
    title: "Everything in one place",
    body: "Booking, payment, materials, homework, feedback and your tutor's messages all live in one portal. Nothing in a spreadsheet.",
  },
];

// The tutor section reads the live roster; re-read it at most once a minute.
export const revalidate = 60;

export default async function HomePage() {
  const tutors = (await fetchPublicTutors()).slice(0, 3);

  // GAMES-HIDDEN
  // const colomboSites = heritageSites.filter((site) => site.region === "Colombo");

  return (
    <>
      <section className="relative overflow-hidden bg-jade-700">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute -right-24 -bottom-24 size-[32rem] fill-white/5"
        >
          <path d="M12 20V9" />
          <path d="M12 9c0-3.2 2.4-5.6 5.6-5.6C17.6 6.6 15.2 9 12 9Z" />
          <path d="M12 9C12 5.8 9.6 3.4 6.4 3.4 6.4 6.6 8.8 9 12 9Z" />
          <path d="M12 9c3.2 0 5.6 2.4 5.6 5.6C14.4 14.6 12 12.2 12 9Z" />
          <path d="M12 9c-3.2 0-5.6 2.4-5.6 5.6C9.6 14.6 12 12.2 12 9Z" />
        </svg>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-rise">
            <p className="text-xs font-semibold tracking-[0.28em] text-jade-200 uppercase">
              Tutors for Sri Lankans wherever they call home
            </p>

            <h1 className="mt-6 max-w-xl text-3xl leading-[1.12] text-sand-50 sm:text-4xl lg:text-5xl">
              The language you speak with your grandmother is worth fighting
              for.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-jade-100">
              serendib.learn connects Sri Lankan communities around the world
              with exceptional, personally vetted tutors with the purpose of
              keeping the Sinhala and Tamil languages alive.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/portal/signup" size="lg">
                Start learning
              </ButtonLink>
              <ButtonLink href="/tutors" variant="secondary" size="lg">
                Meet the tutors
              </ButtonLink>
              {/* Decks are off the landing page for now.
              <ButtonLink href="/games/languages" variant="secondary" size="lg">
                Play the free decks
              </ButtonLink>
              */}
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-7">
              {[
                { value: "2", label: "languages, Sinhala and Tamil" },
                { value: "1:1", label: "live lessons on Google Meet" },
                { value: "100%", label: "tutors personally vetted" },
                // Deck stats, parked with the games:
                // { value: totalPhraseCount, label: "phrases, free" },
                // { value: allChapters.length, label: "story chapters" },
                // { value: heritageSites.length, label: "heritage sites" },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="font-display text-3xl text-sand-50">{item.value}</dt>
                  <dd className="mt-0.5 text-xs leading-snug text-jade-200">{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-rise lg:pl-6">
            <WelcomeCard />
            {/* Decks are off the landing page for now.
            <PhraseCardStack />
            */}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="How it works" title="Three steps, and the first one is a sentence.">
          We match people to tutors by hand. It is slower than an algorithm and it
          works considerably better.
        </SectionHeading>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number}>
              <Card className="h-full p-7">
                <span className="font-display text-sm font-semibold tracking-widest text-saffron-500">
                  {step.number}
                </span>
                <h3 className="mt-4 text-xl">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-900/8 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="Why us" title="Why people stay after the trial lesson.">
            There is no shortage of language apps. There is a shortage of people who
            will teach you how your own family talks.
          </SectionHeading>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {reasons.map((reason) => (
              <div
                key={reason.title}
                className="rounded-2xl bg-sand-50 p-7 ring-1 ring-ink-900/6"
              >
                <span className="text-2xl" aria-hidden>
                  {reason.emoji}
                </span>
                <h3 className="mt-4 text-lg">{reason.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-500">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow="Tutors" title="The people you would actually be talking to.">
            Small on purpose. We would rather have a handful of tutors we trust than
            forty we have never met.
          </SectionHeading>
          <ButtonLink href="/tutors" variant="secondary">
            Meet everyone
          </ButtonLink>
        </div>

        {tutors.length === 0 ? (
          <Card className="mt-12 p-8 text-center">
            <p className="font-display text-xl text-ink-900">Our first tutors are joining now.</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-500">
              Every one of them is interviewed by us before they appear here. Register your
              interest below and we will introduce you personally.
            </p>
          </Card>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {tutors.map((tutor) => (
              <Card key={tutor.id} className="flex h-full flex-col p-7">
                <div className="flex items-center gap-3">
                  <Avatar name={tutor.name} avatarId={tutor.avatarId} size="lg" />
                  <div>
                    <h3 className="text-lg leading-tight">{tutor.name}</h3>
                    <p className="text-xs text-ink-400">
                      {[
                        tutor.homeTown,
                        tutor.yearsTeaching ? `${tutor.yearsTeaching} years teaching` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                {tutor.headline ? (
                  <p className="mt-5 font-display text-base leading-snug text-ink-800">
                    &ldquo;{tutor.headline}&rdquo;
                  </p>
                ) : null}
                <p className="mt-3 line-clamp-5 flex-1 text-sm leading-relaxed text-ink-500">
                  {tutor.bio}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-ink-900/8 pt-5">
                  {tutor.languages.map((language) => (
                    <Badge key={language} tone={language === "sinhala" ? "jade" : "clay"}>
                      {language === "sinhala" ? "Sinhala" : "Tamil"}
                    </Badge>
                  ))}
                  {tutor.hourlyRateUsd ? (
                    <span className="ml-auto text-sm font-medium text-ink-700">
                      ${tutor.hourlyRateUsd}
                      <span className="text-xs font-normal text-ink-400">/hr</span>
                    </span>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* GAMES-HIDDEN: games are parked for now — see src/lib/features.ts.
          Uncomment this section (and the colomboSites line above) to bring it back.
      <section className="border-y border-white/10 bg-jade-700 text-sand-100">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-jade-200 uppercase">
              Games
            </p>
            <h2 className="text-3xl leading-tight text-sand-50 sm:text-4xl">
              Learn it as a story, not a word list.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-sand-200/75">
              Two modes, both free, no account needed. Play a chapter on the bus and
              you will arrive knowing how to ask what it costs.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Link
              href="/games/languages"
              className="group rounded-2xl bg-white/6 p-8 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <span className="text-3xl" aria-hidden>
                🗣️
              </span>
              <h3 className="mt-5 text-2xl text-sand-50">Survival Sri Lanka</h3>
              <p className="mt-3 text-sm leading-relaxed text-sand-200/75">
                Eight chapters that take you from the airport gate to your
                grandmother&rsquo;s front room. {totalPhraseCount} phrases, in Sinhala
                and Tamil, script and romanisation.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {allChapters.slice(0, 5).map((chapter) => (
                  <span
                    key={chapter.id}
                    className="rounded-full bg-white/8 px-3 py-1 text-xs text-sand-200/80"
                  >
                    {chapter.emoji} {chapter.title}
                  </span>
                ))}
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-sand-200/80">
                  +{allChapters.length - 5} more
                </span>
              </div>
              <p className="mt-7 text-sm font-medium text-jade-200 transition group-hover:text-white">
                Start Chapter 1 →
              </p>
            </Link>

            <Link
              href="/games/heritage"
              className="group rounded-2xl bg-white/6 p-8 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <span className="text-3xl" aria-hidden>
                🛕
              </span>
              <h3 className="mt-5 text-2xl text-sand-50">Explore Heritage</h3>
              <p className="mt-3 text-sm leading-relaxed text-sand-200/75">
                {heritageSites.length} places, from Sigiriya to the streets of Pettah,
                with the {colomboSites.length} Colombo landmarks that show why the city
                is a melting pot rather than a monument.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Sigiriya", "Galle Face Green", "Pettah", "Adam's Peak", "Galle Fort"].map(
                  (name) => (
                    <span
                      key={name}
                      className="rounded-full bg-white/8 px-3 py-1 text-xs text-sand-200/80"
                    >
                      {name}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-7 text-sm font-medium text-jade-200 transition group-hover:text-white">
                Open the map →
              </p>
            </Link>
          </div>
        </div>
      </section>
      */}

      <section id="waitlist" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading eyebrow="Waitlist" title="Not ready to book? Get in the queue.">
              We take on a handful of new students each month so nobody ends up with a
              tutor who does not suit them. Tell us what you need and we will write when
              we have the right match.
            </SectionHeading>

            <div className="mt-9 space-y-4">
              {[
                "You pick the tutor, not the other way round",
                "Sessions are one at a time — no bundles to commit to",
                "A free Sinhala and Tamil alphabet sheet while you wait",
              ].map((line) => (
                <p key={line} className="flex items-start gap-3 text-sm text-ink-600">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-jade-100 text-jade-700">
                    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" />
                    </svg>
                  </span>
                  {line}
                </p>
              ))}
            </div>
          </div>

          <Card className="p-7 sm:p-9">
            <WaitlistForm />
          </Card>
        </div>
      </section>
    </>
  );
}

/** Hero companion now that the phrase decks are off the landing page. */
function WelcomeCard() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-x-6 -bottom-3 h-full rounded-3xl bg-jade-600/12" />
      <div aria-hidden className="absolute inset-x-3 -bottom-1.5 h-full rounded-3xl bg-saffron-400/25" />

      <div className="relative rounded-3xl bg-white p-7 shadow-lifted ring-1 ring-ink-900/8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-jade-600 uppercase">
              Sinhala
            </p>
            <p className="text-sinhala mt-1 text-3xl leading-snug text-ink-900">ආයුබෝවන්</p>
            <p className="text-sm text-ink-500">ā-yu-bō-wan · &ldquo;may you live long&rdquo;</p>
          </div>
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-clay-500 uppercase">
              Tamil
            </p>
            <p className="text-tamil mt-1 text-3xl leading-snug text-ink-900">வணக்கம்</p>
            <p className="text-sm text-ink-500">va-ṇak-kam · &ldquo;I greet you&rdquo;</p>
          </div>
        </div>

        <ul className="mt-7 space-y-3 border-t border-ink-900/8 pt-6">
          {[
            "A tutor who grew up speaking the language, chosen with you",
            "Live one-to-one lessons with a Google Meet link for every booking",
            "Materials, homework and feedback kept in one portal",
            "A vetted community to practise with between lessons",
          ].map((line) => (
            <li key={line} className="flex items-start gap-3 text-sm text-ink-600">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-jade-100 text-jade-700">
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" />
                </svg>
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
