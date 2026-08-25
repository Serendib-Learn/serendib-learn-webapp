import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Serendib Learn collects, why, how long we keep it, and how to get it deleted.",
};

const sections = [
  {
    id: "what-we-collect",
    heading: "What we collect",
    body: [
      "When you create an account we collect your name, email address, the language you want to learn, and your timezone. If you join the waitlist we collect the same, plus the sentence you write about why you are learning.",
      "When you book a lesson we store the booking, who it is with, and a record that payment was taken. Card details are handled by our payment provider and never reach our servers.",
      "Inside the portal we store the material your tutor assigns you, your homework and its feedback, lesson summaries written by your tutor, messages between you and your tutor, and anything you post to the community.",
      "The games store your chapter results against your account if you are logged in. If you are not logged in, they stay in your browser and we never see them.",
    ],
  },
  {
    id: "why",
    heading: "Why we collect it",
    body: [
      "To run the thing you signed up for: matching you to a tutor, taking a booking, delivering the lesson, and keeping your materials somewhere you can find them again.",
      "To let your tutor teach you properly. A tutor can see your lesson history, your homework and your progress, because teaching without that is guesswork.",
      "To send you the small number of emails the service depends on — email confirmation, password resets, booking receipts, and a note when your tutor assigns you something.",
      "We do not sell your data, we do not share it with advertisers, and we do not use it to train anything.",
    ],
  },
  {
    id: "who-sees",
    heading: "Who can see what",
    body: [
      "Your tutor can see your name, the language you are learning, your bookings with them, the material they have assigned you, your homework and their own lesson notes. They cannot see your other tutors' notes or your payment details.",
      "Other members can see your name and anything you choose to post to the community. Community posts are reviewed by an administrator before they appear.",
      "Our administrators can see account records in order to provide support, resolve payment problems and moderate the community. That access is logged.",
    ],
  },
  {
    id: "how-long",
    heading: "How long we keep it",
    body: [
      "Account records, lesson history and materials are kept while your account is open, so that you can go back to a lesson from a year ago.",
      "If you delete your account we remove your profile, messages, homework and community posts within 30 days. We keep the minimum financial record of transactions that tax law requires us to keep.",
      "Waitlist entries are deleted after twelve months if you never went on to create an account.",
    ],
  },
  {
    id: "your-rights",
    heading: "Your rights",
    body: [
      "You can ask us for a copy of everything we hold about you, ask us to correct it, or ask us to delete it. Write to privacy@serendiblearn.com and we will come back to you within 30 days.",
      "You can withdraw consent for anything optional at any time without losing access to lessons.",
      "If you are in the UK or EU you have the rights set out in the UK GDPR and GDPR, including the right to complain to your data protection authority.",
    ],
  },
  {
    id: "cookies",
    heading: "Cookies and storage",
    body: [
      "We use a session cookie to keep you logged in. That is a strict necessity and there is no way to run a portal without it.",
      "We store your game progress and interface preferences in your browser's local storage. That never leaves your device unless you are logged in and choose to sync it.",
      "We do not run third-party advertising or tracking cookies.",
    ],
  },
  {
    id: "children",
    heading: "Children",
    body: [
      "Students under 16 need a parent or guardian to create and hold the account. The guardian's email is the one we contact, and the guardian can see everything in the portal.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: [
      "If we change anything that affects how we use your data, we will email account holders before it takes effect rather than quietly updating this page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-weave border-b border-ink-900/8">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
          <Badge tone="jade">Legal</Badge>
          <h1 className="mt-6 text-4xl leading-[1.1] sm:text-5xl">Privacy policy</h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-600">
            Written to be read. If anything here is unclear, email{" "}
            <a
              href="mailto:privacy@serendiblearn.com"
              className="text-jade-700 underline decoration-jade-300 underline-offset-4"
            >
              privacy@serendiblearn.com
            </a>{" "}
            and we will explain it in plainer terms.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <Alert tone="saffron">
          This site is a working prototype. It stores its data in your own browser rather
          than on a server, so nothing you enter here is transmitted anywhere. The policy
          below describes the intended production service.
        </Alert>

        <nav aria-label="On this page" className="mt-10 rounded-2xl bg-white p-6 ring-1 ring-ink-900/8">
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-400 uppercase">
            On this page
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <Link
                  href={`#${section.id}`}
                  className="text-sm text-ink-600 transition hover:text-jade-700"
                >
                  <span className="text-ink-300">{index + 1}. </span>
                  {section.heading}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-14 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-2xl">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="leading-relaxed text-ink-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-ink-900/10 pt-6 text-sm text-ink-400">
          Serendib Learn · privacy@serendiblearn.com
        </p>
      </div>
    </>
  );
}
