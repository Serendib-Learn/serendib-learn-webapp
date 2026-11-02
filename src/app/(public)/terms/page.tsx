import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, LegalSection } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "The terms for using Serendib Learn: accounts, booking and paying for Sinhala and Tamil lessons, conduct, safeguarding and your rights.",
};

const refunds = (
  <Link href="/refunds" className="text-amber-spice underline">
    Cancellation and Refund Policy
  </Link>
);

const privacy = (
  <Link href="/privacy" className="text-amber-spice underline">
    Privacy Policy
  </Link>
);

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      updated="2 November 2026"
      intro={
        <>
          <p>
            These terms apply when you use the Serendib Learn website and learning portal (the
            &quot;Service&quot;) to learn or teach Sinhala and Tamil. In these terms,
            &quot;Serendib Learn&quot;, &quot;we&quot;, &quot;us&quot; and &quot;our&quot; mean
            the people who run Serendib Learn in Sri Lanka, and &quot;you&quot; means anyone
            using the Service.
          </p>
          <p>
            By creating an account or booking a lesson, you agree to these terms, our {refunds}{" "}
            and our {privacy}. Please read them; if you do not agree, please do not use the
            Service.
          </p>
        </>
      }
    >
      <LegalSection title="1. What we offer">
        <p>
          Serendib Learn connects students with tutors for live, one-to-one Sinhala and Tamil
          lessons over Google Meet, together with practice materials, homework, lesson feedback
          and a learner community. Unless a booking says otherwise, a lesson lasts 60 minutes.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <ul>
          <li>
            Give accurate details when you sign up and keep them up to date, including your
            timezone, which we use to show lesson times.
          </li>
          <li>
            Your account is for you alone. Keep your login safe and tell us straight away at{" "}
            <ContactEmail /> if you think someone else has used it. You are responsible for what
            is done through your account.
          </li>
          <li>
            You must be 18 or older to open an account. A child or teenager may learn with us
            through an account opened and managed by their parent or guardian, who agrees to
            these terms on their behalf, books and pays for lessons, and is responsible for their
            use of the Service. We encourage a parent or guardian to be nearby during lessons with
            young children.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Booking and paying for lessons">
        <ul>
          <li>
            You can book any open hour a tutor has published. Lesson times are shown in your own
            timezone.
          </li>
          <li>
            The price of a lesson is shown on our tutors page and at checkout before you pay. Prices
            are in Sri Lankan rupees (LKR). If we change our prices, the change never affects a
            lesson you have already paid for.
          </li>
          <li>
            Payments are taken by card through our payment provider, Payments.lk, on its secure
            page. We never see or store your full card details. If your card is in another
            currency, your bank converts the amount and may charge its own fees.
          </li>
          <li>
            A booking is confirmed once payment succeeds, and we email you a receipt. An unpaid
            booking holds the hour for about 30 minutes and is then released.
          </li>
          <li>
            Lessons booked with a lesson credit (a &quot;free lesson&quot;) are confirmed without a
            payment.
          </li>
          <li>
            A bundle is 5 or 10 lessons, with any of our tutors, chosen together and paid for in one
            payment. Nothing renews. Until it is paid, a bundle holds its hours as one: it is released
            together if it is not paid in time. Once paid, each lesson is moved, cancelled and refunded
            like any other.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Moving, cancelling and refunds">
        <p>
          You can move a lesson, or cancel it and keep it as a credit, up to 6 hours before it
          starts. A lesson cancelled later, or missed, counts as used. Unused lessons can be
          refunded within 30 days of payment, and if your tutor or we cancel, you keep the lesson
          or can have a full refund. The full rules are in our {refunds}, which forms part of these
          terms.
        </p>
      </LegalSection>

      <LegalSection title="5. Lessons">
        <ul>
          <li>
            Lessons take place on Google Meet. You need a reliable internet connection, a
            microphone, and ideally a camera. Problems with your own equipment or connection do
            not make a lesson a missed lesson.
          </li>
          <li>
            Please join on time. A lesson ends at its booked time even if it started late.
          </li>
          <li>
            Lessons are not recorded by Serendib Learn. Neither you nor your tutor may record a
            lesson without the other&apos;s clear agreement.
          </li>
          <li>
            If your tutor becomes unavailable, we may offer you another tutor or a replacement
            lesson. You are never obliged to accept another tutor.
          </li>
          <li>
            Our tutors are experienced and we work hard to keep lessons excellent, but how quickly
            anyone learns a language depends on many things, so we cannot promise a particular
            result by a particular date.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Conduct and safeguarding">
        <ul>
          <li>
            Treat tutors, students and our team with respect. Harassment, discrimination,
            threatening or sexual behaviour, and sharing inappropriate content are not allowed, in
            lessons, messages or the community.
          </li>
          <li>
            Tutors must act professionally at all times, especially with learners under 18, and
            keep contact with students on the Service.
          </li>
          <li>
            If anything makes you uncomfortable, or you are worried about a child&apos;s safety,
            tell us at <ContactEmail />. We take every concern seriously and act promptly.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Tutors">
        <ul>
          <li>
            Tutors are independent professionals whom we interview and approve before they can be
            booked. They are not our employees, and their own agreement with us sets out their pay
            and responsibilities.
          </li>
          <li>
            Lessons with a tutor you met through Serendib Learn must be booked and paid for through
            the Service. Please do not pay a tutor directly, and tell us if anyone asks you to.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Community, messages and feedback">
        <ul>
          <li>
            Community posts are checked by our team before they appear, and we may decline or
            remove anything that breaks these terms. Do not share personal contact details with
            people you do not know.
          </li>
          <li>
            Feedback and voice notes you leave after a lesson are shared with your tutor and our
            team, to improve teaching.
          </li>
          <li>
            You keep ownership of what you post, write or record. You give us permission to store
            it and show it to the people it is meant for, and to use it to run and improve the
            Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Our content">
        <p>
          The Serendib Learn name and logo, the website, and our learning materials (phrase lists,
          alphabet sheets, course chapters, recordings and lesson resources) belong to Serendib
          Learn or our tutors. You may use them for your own learning. Please do not copy, sell or
          republish them without our permission.
        </p>
      </LegalSection>

      <LegalSection title="10. Using the Service fairly">
        <p>You agree not to:</p>
        <ul>
          <li>use the Service for anything unlawful, harmful or misleading;</li>
          <li>sign up with false details, or pretend to be someone else;</li>
          <li>
            try to get into other people&apos;s accounts, or interfere with, overload, scrape or
            probe the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Suspending or closing an account">
        <p>
          You can ask us to close your account at any time. Unused lessons are refunded in line with
          our {refunds}.
        </p>
        <p>
          We may suspend or close an account that breaks these terms, after a warning where
          that is appropriate, or straight away for a serious breach such as a safeguarding concern.
          If we close an account for a serious breach, lessons paid for by that account are not
          refunded, except where the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="12. Privacy">
        <p>
          We handle your personal information as described in our {privacy}, in line with Sri
          Lanka&apos;s Personal Data Protection Act, No. 9 of 2022.
        </p>
      </LegalSection>

      <LegalSection title="13. Availability of the Service">
        <p>
          We aim to keep the Service running smoothly, but it may sometimes be unavailable for
          maintenance, or because of problems with services we rely on, such as Google or
          Payments.lk, or with the internet. If a lesson cannot take place because of a problem on
          our side, our {refunds} applies.
        </p>
      </LegalSection>

      <LegalSection title="14. Our responsibility to you">
        <ul>
          <li>
            We provide the Service with reasonable care and skill. If we fail to, and you lose out
            as a result, contact us and we will try to put it right.
          </li>
          <li>
            As far as the law allows, our total liability to you for any claim is limited to the
            amount you paid us for lessons in the six months before the claim, and we are not
            responsible for losses that were not foreseeable.
          </li>
          <li>
            Nothing in these terms limits or excludes liability that cannot be limited or excluded
            by law, or takes away your rights under the consumer protection laws that apply to you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="15. Changes to these terms">
        <p>
          We may update these terms as the Service develops. The date at the top shows when they
          last changed. We will email account holders about important changes before they take
          effect, and the version in force when you booked a lesson applies to that lesson.
        </p>
      </LegalSection>

      <LegalSection title="16. Law and disputes">
        <p>
          These terms are governed by the laws of Sri Lanka, and the courts of Sri Lanka have
          jurisdiction over any dispute. If you live elsewhere, you also keep any protection the
          law of your country gives you and may bring a claim there. If something goes wrong,
          please talk to us first. Most problems are solved quickly that way.
        </p>
      </LegalSection>

      <LegalSection title="17. Contact us">
        <p>
          Questions about these terms, or anything else: <ContactEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
