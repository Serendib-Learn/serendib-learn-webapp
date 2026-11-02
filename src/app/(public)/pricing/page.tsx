import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { fetchPaymentsConfig } from "@/lib/api/public";
import { lkr } from "@/lib/format";
import { IntroCallButton } from "@/components/site/intro-call";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Sinhala and Tamil lessons with Serendib Learn: one class at a time, or 5 or 10 booked together and paid for once. Start with a free intro call.",
};

// Prices come from the API (LESSON_PRICE_LKR, BUNDLE_SIZES): re-read them at most once a minute.
export const revalidate = 60;

interface Plan {
  title: string;
  /** Lessons in it: 1 for a single class. */
  lessons: number;
  blurb: string;
  cta: string;
  href: string;
  recommended?: boolean;
}

/** What each bundle size is for, in the owners' words. Sizes without a blurb get a plain one. */
const bundleBlurbs: Record<number, { blurb: string; recommended?: boolean }> = {
  5: { blurb: "A regular hour that fits around school, work and life." },
  10: {
    blurb:
      "Languages stick through regular practice. Meeting twice a week keeps new words fresh between sessions, so you build on each class instead of starting over.",
    recommended: true,
  },
};

/**
 * The pricing page, from the owners' design: a single class, or a bundle of
 * 5 or 10 picked in the calendar and paid for once (server/src/lib/bundles.ts),
 * and a free intro call with the team to help choose.
 */
export default async function PricingPage() {
  const config = await fetchPaymentsConfig();
  const price = config?.lessonPriceLkr ?? null;
  const sizes = config?.bundleSizes ?? [5, 10];

  const plans: Plan[] = [
    {
      title: "Single class",
      lessons: 1,
      blurb: "Book one class at a time, whenever it suits you. Good for trying things out or for a top-up session.",
      cta: "Book a single class",
      href: "/portal/calendar",
    },
    ...sizes.map((size) => ({
      title: `${size} sessions`,
      lessons: size,
      blurb: bundleBlurbs[size]?.blurb ?? `${size} lessons, booked together and paid for once.`,
      cta: `Choose ${size} sessions`,
      href: `/portal/calendar?bundle=${size}`,
      recommended: bundleBlurbs[size]?.recommended,
    })),
  ];

  return (
    <>
      <section className="px-5 pt-16 pb-12 sm:px-8 sm:pt-22">
        <div className="mx-auto flex max-w-6xl flex-col gap-12">
          <div className="max-w-3xl space-y-4">
            <p className="label-eyebrow">Pricing</p>
            <h1 className="text-4xl leading-[1.05] sm:text-5xl">Choose how you&apos;d like to learn</h1>
            <p className="text-lg leading-relaxed text-ink-600">
              Start with a free intro call. Once you&apos;ve found the right tutor, pick what works for you.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.title} plan={plan} price={price} />
            ))}
          </div>

          <ul className="flex flex-wrap gap-x-8 gap-y-3 border-t border-ink-900/10 pt-6 text-sm text-ink-600">
            <li>Book every session up front, with any of our tutors</li>
            <li>
              Move or cancel up to 6 hours before and keep the lesson (
              <Link href="/refunds" className="underline hover:text-ink-900">
                refund policy
              </Link>
              )
            </li>
            <li>Pay once: nothing renews</li>
            <li>Prices in Sri Lankan rupees (LKR); your bank converts from your currency</li>
          </ul>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 rounded-[20px] border border-ink-900/10 bg-white p-8 sm:p-10">
          <div className="max-w-xl space-y-2">
            <h2 className="text-3xl">Not sure which to pick?</h2>
            <p className="text-base leading-relaxed text-ink-600">
              Your free intro call is the place to decide. Our team can suggest a tutor and a rhythm based on your goals.
            </p>
          </div>
          <IntroCallButton className="rounded-full bg-amber-spice px-6 py-3.5 text-base font-semibold text-white transition hover:bg-amber-light" />
        </div>
      </section>
    </>
  );
}

function PlanCard({ plan, price }: { plan: Plan; price: number | null }) {
  const dark = Boolean(plan.recommended);
  return (
    <article
      className={cn(
        "flex flex-col gap-5 rounded-[20px] p-8 sm:p-9",
        dark ? "bg-forest text-cream shadow-[0_18px_40px_rgba(27,67,50,0.18)]" : "border border-ink-900/10 bg-white",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={cn("font-display text-3xl", dark ? "text-cream" : "text-forest")}>{plan.title}</h3>
        {plan.recommended ? (
          <span className="rounded-full bg-saffron-100 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-900">
            Recommended
          </span>
        ) : null}
      </div>
      {price ? (
        <p className="flex flex-wrap items-baseline gap-2">
          <span className={cn("font-display text-5xl leading-none", dark ? "text-cream" : "text-forest")}>
            {lkr(price * plan.lessons)}
          </span>
          <span className={cn("text-base", dark ? "text-sage" : "text-ink-500")}>
            {plan.lessons === 1 ? "/ class" : `for ${plan.lessons} classes`}
          </span>
        </p>
      ) : (
        <p className={cn("text-base", dark ? "text-sage" : "text-ink-500")}>Shown when you book.</p>
      )}
      <hr className={dark ? "border-cream/20" : "border-ink-900/10"} />
      <p className={cn("flex-grow text-base leading-relaxed", dark ? "text-cream/90" : "text-ink-600")}>{plan.blurb}</p>
      <Link
        href={plan.href}
        className={cn(
          "block rounded-xl px-5 py-3.5 text-center text-base font-semibold transition",
          dark
            ? "bg-cream text-forest hover:bg-white"
            : plan.lessons === 1
              ? "border-2 border-forest text-forest hover:bg-forest/5"
              : "bg-forest text-cream hover:bg-fern",
        )}
      >
        {plan.cta}
      </Link>
    </article>
  );
}
