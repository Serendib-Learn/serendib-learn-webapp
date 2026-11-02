import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, LegalSection } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Cancellation and Refund Policy",
  description:
    "Moving, cancelling and refunding Serendib Learn lessons: keep your lesson when you cancel at least 6 hours before, and refunds of unused lessons within 30 days.",
};

/**
 * The refund policy the portal enforces: 6 hours' notice is STUDENT_NOTICE_HOURS
 * (server/src/routes/bookings.ts), and cancelling in time gives a free lesson
 * (lib/credits.ts). Change them together.
 */
export default function RefundsPage() {
  return (
    <LegalPage
      title="Cancellation and Refund Policy"
      updated="2 November 2026"
      intro={
        <p>
          Plans change. This policy explains what happens when you need to move or cancel a
          lesson with Serendib Learn, and when you can have your money back. It forms part of our{" "}
          <Link href="/terms" className="text-amber-spice underline">
            Terms and Conditions
          </Link>
          .
        </p>
      }
    >
      <LegalSection title="In short">
        <ul>
          <li>
            <strong>Cancel at least 6 hours before your lesson and you keep it</strong>: it becomes
            a lesson credit to book again whenever suits you. Cancel later, or miss the lesson, and
            the lesson is used.
          </li>
          <li>
            <strong>Moving a lesson is free</strong> up to 6 hours before it starts.
          </li>
          <li>
            <strong>Unused lessons can be refunded within 30 days</strong> of paying for them.
          </li>
          <li>
            <strong>If your tutor or we cancel, you never lose out</strong>: you keep the lesson,
            or can have a full refund.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="1. Moving a lesson">
        <p>
          You can move a lesson to another of your tutor&apos;s open hours, free of charge, up to 6
          hours before it starts. Use <em>Reschedule</em> on the lesson in your portal calendar.
          The price, your payment and the meeting link stay with the lesson, and both you and your
          tutor are emailed the new time.
        </p>
        <p>
          Less than 6 hours before the lesson, it can no longer be moved from the portal. If
          something unexpected has happened, write to us and we will look at it fairly.
        </p>
      </LegalSection>

      <LegalSection title="2. Cancelling a lesson">
        <ul>
          <li>
            <strong>At least 6 hours before it starts:</strong> cancel it from your portal calendar
            and you keep the lesson as a credit. Book it again with any tutor, at any open hour,
            with <em>Book with a free lesson</em>; there is nothing more to pay.
          </li>
          <li>
            <strong>Less than 6 hours before, or not attending:</strong> the lesson counts as used
            and is not refunded. Your tutor has kept that hour for you and cannot usually fill it
            at short notice.
          </li>
          <li>
            <strong>Joining late:</strong> the lesson still ends at its booked time. If you have
            not joined within 15 minutes of the start, your tutor may treat the lesson as missed.
          </li>
          <li>
            <strong>A booking you have not paid for yet</strong> can be cancelled at any time.
            Nothing has been charged.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. If your tutor or we cancel, or the lesson cannot go ahead">
        <p>
          If your tutor or Serendib Learn cancels a lesson, at any time, you keep the lesson as a
          credit to book again, and we will email you when it is ready to use.
        </p>
        <p>
          If your tutor does not join, or the lesson cannot take place because of a problem on our
          side, use <em>Report missed lesson</em> on the lesson in your portal calendar within 30
          days. Our team reviews every report and, where it is upheld, gives you a replacement
          lesson.
        </p>
        <p>
          In any of these cases, if you would rather have your money back than a replacement
          lesson, tell us and we will refund the lesson in full.
        </p>
      </LegalSection>

      <LegalSection title="4. Refunds">
        <p>You can ask for a refund to your card of:</p>
        <ul>
          <li>
            an <strong>unused lesson</strong> you paid for, including one you cancelled in good
            time and kept as a credit, within <strong>30 days of the payment</strong>;
          </li>
          <li>a lesson your tutor or we cancelled, or a missed lesson whose report we upheld;</li>
          <li>a payment taken in error, such as a duplicate charge, at any time.</li>
        </ul>
        <p>We cannot refund:</p>
        <ul>
          <li>lessons that have taken place;</li>
          <li>lessons cancelled less than 6 hours before they start, or missed;</li>
          <li>
            unused lessons more than 30 days after the payment. You can still book them, as the
            credit does not expire;
          </li>
          <li>free lessons we have given you as a goodwill gesture, which have no cash value.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How to ask for a refund">
        <p>
          Email <ContactEmail /> from the address on your account, with the date of the lesson
          and your tutor&apos;s name. We will confirm by email, normally within 2 working days.
        </p>
        <p>
          Approved refunds go back to the card you paid with, through our payment provider
          Payments.lk, normally within 5 working days. Your bank may take a further 5 to 10
          working days to show it. Once a lesson is refunded, its credit is removed from your
          account.
        </p>
        <p>
          Lessons are charged in Sri Lankan rupees, and we refund the same amount in rupees. If
          your card is in another currency, the amount your bank shows may differ because of
          exchange rates and your bank&apos;s own fees, which are outside our control.
        </p>
      </LegalSection>

      <LegalSection title="6. Lesson credits">
        <p>
          A credit is one 60-minute lesson with any Serendib Learn tutor. Credits do not expire,
          cannot be transferred to another person, and can be exchanged for money only as set out
          in section 4.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          Nothing in this policy affects your rights under the consumer protection laws that apply
          to you.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          If anything about a cancellation or refund seems unfair, write to us at{" "}
          <ContactEmail />. A real person reads every message.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
