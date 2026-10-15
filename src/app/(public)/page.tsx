import { WaitlistForm } from "@/components/home/waitlist-form";
import { AraliyaFlower } from "@/components/site/araliya-flower";

/*
 * The home page, as on the original serendib.learn site (the Lovable
 * prototype this replaces): the same sections, copy and layout. The one
 * difference is that "Register your interest" is an in-site form — entries
 * land in Administration → Waitlist — instead of an external Google Form.
 */

function Hero() {
  return (
    <section id="top" className="relative scroll-mt-16 overflow-hidden bg-forest">
      <AraliyaFlower className="absolute -right-24 -bottom-24 hidden h-[520px] w-[520px] opacity-[0.06] md:block" />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <p className="label-eyebrow mb-5">&nbsp;TUTORS FOR SRI LANKANS WHEREVER THEY CALL HOME&nbsp;</p>
        <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-cream md:text-6xl">
          The language you speak with your grandmother is worth fighting for.
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-sage md:text-xl">
          serendib.learn connects Sri Lankan communities around the world with exceptional,
          personally vetted tutors with the purpose of keeping the Sinhala and Tamil languages
          alive.&nbsp;
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="#waitlist"
            className="rounded-md bg-amber-spice px-7 py-3.5 font-medium text-white transition-colors hover:bg-amber-light"
          >
            Register your interest
          </a>
        </div>
        <p className="mt-8 text-sm text-sage">Personally vetted tutors · Free intro call · No commitment</p>
      </div>
    </section>
  );
}

const steps = [
  {
    t: "Tell us what you need",
    d: "Fill in a short form - subject, level, goals, schedule, and the language you would like to learn.\u00a0",
  },
  {
    t: "We match you",
    d: "Our team handpicks 2-3 tutors from our vetted roster. You see their full profiles, subjects, and experience.",
  },
  {
    t: "Free intro call",
    d: "Meet your tutor. No commitment, no charge. If the fit isn't right, we rematch until it is.",
  },
  {
    t: "Sessions begin",
    d: "Book and pay through the platform. Your tutor sends a short note after every session. You submit your feedback.\u00a0",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="label-eyebrow mb-3">The process</p>
          <h2 className="mb-3 font-display text-3xl text-forest md:text-4xl">About us</h2>
          <p className="text-lg text-fern">From first enquiry to first session in under a week.</p>
        </div>
        <ol className="grid gap-8 md:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.t}>
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-forest font-display text-sm text-cream">
                {index + 1}
              </div>
              <h3 className="mb-2 font-display text-lg text-forest">{step.t}</h3>
              <p className="text-sm leading-relaxed text-earth/70">{step.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const promises = [
  {
    t: "Personally vetted",
    d: "Every tutor is interviewed by us. We assess fluency, warmth, subject depth, and reliability. Our acceptance rate is under 50%.",
  },
  {
    t: "Quality guaranteed",
    d: "Free rematching if the fit isn't right. Post-session notes after every class. A platform that stands behind every tutor on it.",
  },
];

function WhyUs() {
  return (
    <section id="why" className="scroll-mt-16 bg-forest px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="label-eyebrow mb-3">Our promise</p>
          <h2 className="font-display text-3xl text-cream md:text-4xl">Why families choose Serendib</h2>
        </div>
        <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
          {promises.map((item) => (
            <div key={item.t}>
              <div className="mb-5 h-0.5 w-8 bg-amber-spice" />
              <h3 className="mb-3 font-display text-xl text-cream">{item.t}</h3>
              <p className="leading-relaxed text-sage">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Waitlist() {
  return (
    <section id="waitlist" className="scroll-mt-16 bg-cream px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-3 font-display text-3xl text-forest md:text-4xl">Register your interest</h2>
        <p className="mb-10 text-fern">
          We&apos;re onboarding our first families now. Secure your spot - we&apos;ll be in touch
          within 48 hours.
        </p>
      </div>
      <div className="mx-auto max-w-[480px] text-left">
        <WaitlistForm />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyUs />
      <Waitlist />
    </>
  );
}

/*
 * GAMES-HIDDEN: the games teaser that sat on the previous home page. To bring
 * it back, set features.games in src/lib/features.ts, render this inside
 * HomePage, and restore its imports (Link, allChapters, totalPhraseCount,
 * heritageSites, and a colomboSites constant filtered from heritageSites).
 *
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
 */
