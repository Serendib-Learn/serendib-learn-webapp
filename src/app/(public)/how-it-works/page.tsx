import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, SectionHeading } from "@/components/ui/primitives";
import { tutorProfiles } from "@/data/tutors";
import { allChapters, totalPhraseCount } from "@/data/vocabulary";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How lessons, booking, payment, materials and homework work at Serendib Learn.",
};

const stages = [
  {
    step: "01",
    title: "Tell us why you're learning",
    body: "Sign up and answer one question: what do you want to be able to do? A wedding speech, a phone call with a grandparent, a work posting in Trincomalee. That answer decides your first fifty words.",
    detail: [
      "Takes about a minute",
      "No card needed to create an account",
      "Pick Sinhala, Tamil, or ask us which one",
    ],
  },
  {
    step: "02",
    title: "Pick a tutor and a time",
    body: "Every tutor publishes real availability. You see it converted into your own timezone, pick an hour that works, and pay for that one session. There are no bundles and nothing renews.",
    detail: [
      "Availability shown in your timezone",
      "Pay per session, one at a time",
      "Meeting link appears as soon as payment clears",
    ],
  },
  {
    step: "03",
    title: "Have the lesson",
    body: "One hour, one-to-one, video. Your tutor writes up what you covered afterwards — what went well, what to work on, and every word introduced — and it goes straight into your portal.",
    detail: [
      "60 or 90 minute sessions",
      "Lesson summary written up after every class",
      "Message your tutor between lessons",
    ],
  },
  {
    step: "04",
    title: "Practise in between",
    body: "Your tutor puts worksheets, recordings and homework in your learning hub. On the days you have no lesson, the games keep the vocabulary from going cold.",
    detail: [
      "Materials assigned to you personally",
      "Homework with written feedback and a score",
      `${totalPhraseCount} free phrases across ${allChapters.length} chapters`,
    ],
  },
];

const faqs = [
  {
    q: "Do I need to know the script?",
    a: "No, and most students never start there. Every phrase we teach comes with a romanised version, so you can be having conversations long before you can read a street sign. When you do want the script, we teach it properly.",
  },
  {
    q: "Sinhala or Tamil — which should I learn?",
    a: "If you have family, learn theirs. If you are moving somewhere specific, learn what is spoken there: Sinhala across most of the south and centre, Tamil in the north and east, and a great deal of both in Colombo. If you genuinely do not know, say so on the waitlist form and we will talk it through.",
  },
  {
    q: "I understand it but I can't speak it. Is that normal?",
    a: "It is the single most common thing we see. Comprehension without production means the vocabulary is in there and the retrieval is not built yet. It comes back much faster than learning from nothing, and it is what our tutors are best at.",
  },
  {
    q: "What does it cost?",
    a: `Between $${Math.min(...tutorProfiles.map((tutor) => tutor.hourlyRateUsd))} and $${Math.max(...tutorProfiles.map((tutor) => tutor.hourlyRateUsd))} an hour depending on the tutor, paid per session. The games and phrase decks are free and always will be.`,
  },
  {
    q: "Can I change tutors?",
    a: "Yes, at any time, and nobody takes it personally. Different tutors suit different reasons for learning. You can also work with two at once — some students do one Sinhala and one Tamil.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancel from the portal. More than 24 hours before the session and it is refunded in full; inside 24 hours we ask you to reschedule instead, because your tutor has already held the slot.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-weave border-b border-ink-900/8">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <Badge tone="jade">How it works</Badge>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-5xl">
            A tutor, an hour, and somewhere to keep everything.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            No subscription to forget about and no streak to maintain. You book a
            lesson, you have the lesson, and the portal remembers the rest.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <ol className="space-y-6">
          {stages.map((stage) => (
            <li key={stage.step}>
              <Card className="grid gap-8 p-8 md:grid-cols-[auto_1fr_auto] md:items-start md:p-10">
                <span className="font-display text-4xl font-semibold text-saffron-400">
                  {stage.step}
                </span>
                <div>
                  <h2 className="text-2xl">{stage.title}</h2>
                  <p className="mt-3 max-w-xl leading-relaxed text-ink-600">{stage.body}</p>
                </div>
                <ul className="space-y-2.5 md:w-64">
                  {stage.detail.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-ink-500">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-jade-400" />
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-900/8 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="Questions" title="The things people ask before booking." />

          <dl className="mt-12 grid gap-x-12 gap-y-9 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <dt className="font-display text-lg font-semibold text-ink-900">{faq.q}</dt>
                <dd className="mt-2.5 text-sm leading-relaxed text-ink-500">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <Card className="flex flex-col items-start gap-6 p-9 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <h2 className="text-2xl">Ready when you are.</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Create an account and look through real availability, or play a chapter
              first and decide afterwards.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/portal/signup">Create an account</ButtonLink>
            <ButtonLink href="/games/languages" variant="secondary">
              Try a chapter
            </ButtonLink>
          </div>
        </Card>
      </section>
    </>
  );
}
