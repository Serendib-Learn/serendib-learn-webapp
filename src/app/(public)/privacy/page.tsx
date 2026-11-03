import type { Metadata } from "next";
import { ContactEmail, LegalPage, LegalSection } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Serendib.learn collects, uses and protects the information of students and families.",
};


/**
 * The original site's privacy policy, plus the services this version relies on
 * (and "Confidentiality" corrected to say they receive what they need).
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="2 November 2026"
      intro={
        <p>
          Serendib.learn (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is committed to protecting
          the privacy of our students and their families.
        </p>
      }
    >

      <LegalSection title="What we collect">
        <p>We collect personal information solely for the purposes of:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Scheduling and coordinating lessons</li>
          <li>
            Understanding individual learning goals, so we can match students with the right tutor
            and approach
          </li>
          <li>Maintaining a student database to support the ongoing delivery of our services</li>
        </ul>
      </LegalSection>

      <LegalSection title="How your information is used">
        <p>
          The information you provide is used only for the purposes listed above. We do not use
          your data for any purpose beyond delivering and improving our tutoring services.
        </p>
      </LegalSection>

      <LegalSection title="Confidentiality">
        <p>
          All personal and student information is kept strictly confidential. We do not sell or
          rent your information, and we share it only with the services below that carry out
          parts of a lesson for us, and only what each needs.
        </p>
      </LegalSection>

      {/* Added for the portal: the services that carry out parts of a lesson on our behalf. */}
      <LegalSection title="Services we use">
        <p>
          A few trusted services carry out parts of a lesson for us, and receive only what that
          part needs:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">Payments.lk</span> takes card payments on its own secure
            page. We never see or store your card number; we receive only whether the payment went
            through.
          </li>
          <li>
            <span className="font-medium">Google</span>, if you choose to sign in with Google, and
            to create the Google Meet link and calendar invitation for each lesson.
          </li>
        </ul>
        <p>
          Feedback and voice notes you send through the portal are seen only by our team.
        </p>
      </LegalSection>

      {/* For Google's OAuth verification: how the app uses Google user data, and the Limited Use statement. */}
      <LegalSection id="google" title="Google user data">
        <p>Serendib Learn asks for access to a Google account in three cases, and only for what each needs:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">Signing in with Google:</span> we receive your name and email address from
            Google, to create and sign in to your Serendib Learn account.
          </li>
          <li>
            <span className="font-medium">Google Calendar (tutors, and the Serendib team&apos;s own calendar):</span>{" "}
            when a lesson is booked, we create one calendar event with a Google Meet link and invite the student and
            the tutor. We move it if the lesson is rescheduled and delete it if the lesson is cancelled. We only ever
            create and change the lesson events we made; we do not read or change any other events in your calendar.
          </li>
          <li>
            <span className="font-medium">Gmail (the Serendib team&apos;s own account only):</span> we send the
            site&apos;s emails, such as verification codes, booking receipts and reminders, from our own address. We
            only send; we never read any mailbox. Students and tutors are never asked for this.
          </li>
        </ul>
        <p>
          We store only what is needed to keep these connections working (a sign-in token for the calendar or mail
          account, and the IDs of the lesson events we created), stored securely in our database. We do
          not sell Google user data, use it for advertising, or share it with anyone, and no person at Serendib Learn
          reads it except where you ask us to for support, for security, or where the law requires it.
        </p>
        <p>
          Serendib Learn&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-amber-spice underline"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>
          You can disconnect Google Calendar at any time from Calendar &amp; Bookings → My hours, which deletes the
          stored token, or remove Serendib Learn&apos;s access from your Google Account&apos;s{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-amber-spice underline"
            target="_blank"
            rel="noreferrer"
          >
            third-party access page
          </a>
          . To have your data deleted, write to <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          We retain student information for as long as necessary to provide our services. If you
          would like your information updated or removed from our records, please contact us at{" "}
          <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="Contact us">
        <p>
          If you have any questions about this Privacy Policy or how your information is handled,
          please reach out to us at <ContactEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
