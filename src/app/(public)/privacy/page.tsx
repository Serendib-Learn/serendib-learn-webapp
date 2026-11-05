import type { Metadata } from "next";
import { ContactEmail, LegalPage, LegalSection } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Serendib Learn collects, uses and protects the information of students and families.",
};


/**
 * The original site's privacy policy, plus the services this version relies on
 * (and "Confidentiality" corrected to say they receive what they need).
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="5 November 2026"
      intro={
        <p>
          Serendib Learn (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is committed to protecting
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
            page. We send it your name, your email address and the lesson you are paying for. We
            never see or store your card number; we receive only whether the payment went through.
          </li>
          <li>
            <span className="font-medium">Google</span>, if you choose to sign in with Google, to
            create the Google Meet link and calendar invitation for each lesson, and to send our
            emails through Gmail. Google Cloud also runs our server.
          </li>
          <li>
            <span className="font-medium">MongoDB Atlas</span> hosts our database, and{" "}
            <span className="font-medium">Vercel</span> serves the website.
          </li>
          {/* Add Cloudflare here if Turnstile is ever switched on (NEXT_PUBLIC_TURNSTILE_SITE_KEY). */}
        </ul>
        <p>
          Feedback and voice notes you send through the portal are seen only by our team.
        </p>
      </LegalSection>

      {/* For Google's OAuth verification: how the app uses Google user data, and the Limited Use statement. */}
      <LegalSection id="google" title="Google user data">
        <h3 className="font-medium text-forest">What we access</h3>
        <p>Serendib Learn asks for access to a Google account in three cases, and only for what each needs:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">Signing in with Google:</span> we receive your name, email address, profile
            picture and Google account ID.
          </li>
          <li>
            <span className="font-medium">Google Calendar (tutors, and the Serendib team&apos;s own calendar):</span>{" "}
            we receive a token that lets us manage calendar events, the email address of the connected account, and
            the event ID and Google Meet link of each lesson event we create. We do not read or change any other
            events in your calendar.
          </li>
          <li>
            <span className="font-medium">Gmail (the Serendib team&apos;s own account only):</span> we receive a token
            that lets us send email, and the email address of the connected account. We only send; we never read any
            mailbox. Students and tutors are never asked for this.
          </li>
        </ul>

        <h3 className="font-medium text-forest">How we use it</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your sign-in details create your Serendib Learn account, sign you in, and identify you in the portal.</li>
          <li>
            When a lesson is booked, we create one calendar event with a Google Meet link and invite the student and
            the tutor. We move that event if the lesson is rescheduled and delete it if the lesson is cancelled.
          </li>
          <li>The Gmail connection sends the site&apos;s emails, such as verification codes, booking receipts and reminders, from our own address.</li>
        </ul>
        <p>
          We do not use Google user data, whether raw or aggregated or anonymised, for any other purpose. We do not
          use it for advertising or lending, and we do not use it to develop, improve or train AI or machine-learning
          models. No person at Serendib Learn reads it except where you ask us to for support, for security, or where
          the law requires it.
        </p>

        <h3 className="font-medium text-forest">Who it is shared with</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">The people in your lesson:</span> the student and the tutor both get the
            calendar invitation, which shows the attendees&apos; email addresses and the connected account as organiser,
            and the Meet link. Your name and picture may be shown to other members in the portal, and a tutor&apos;s on
            their public profile.
          </li>
          <li>
            <span className="font-medium">Service providers that run the site:</span> Google Cloud and MongoDB Atlas
            process and store this data for us. Payments.lk receives your name and email address when you pay for a
            lesson. They may use it only to provide their service.
          </li>
          <li>
            <span className="font-medium">Authorities</span>, where the law requires it.
          </li>
        </ul>
        <p>
          We do not sell or transfer Google user data, whether raw or aggregated or anonymised, to anyone else. That
          includes advertisers, data brokers and AI services.
        </p>

        <h3 className="font-medium text-forest">How we protect it</h3>
        <p>
          Google user data travels only over encrypted (HTTPS) connections. Calendar and Gmail tokens are kept on our
          server: they are never sent to a browser or shown in the portal, including to our own team. Our database
          is encrypted at rest by its host, needs credentials to reach, and is available only to the small team
          running the site.
        </p>

        <h3 className="font-medium text-forest">How long we keep it, and deleting it</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">Calendar and Gmail tokens</span> are kept until the connection is ended. We
            delete a token as soon as you disconnect or your account is deleted, and ask Google to withdraw our access.
          </li>
          <li>
            <span className="font-medium">Your sign-in details</span> are kept while your account is open and deleted
            with it.
          </li>
          <li>
            <span className="font-medium">Event IDs and Meet links</span> stay on the lesson&apos;s record, which we keep
            for payment, refund and tutor-pay records, including after an account is deleted. A log of account
            deletions also keeps the deleted account&apos;s name and email address. Calendar events already created
            stay in the calendar until the lesson is cancelled or you delete them.
          </li>
        </ul>
        <p>
          You can disconnect Google Calendar at any time from Calendar &amp; Bookings → My hours, or remove Serendib
          Learn&apos;s access from your Google Account&apos;s{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-amber-spice underline"
            target="_blank"
            rel="noreferrer"
          >
            third-party access page
          </a>
          . To have your account and its Google user data deleted, write to <ContactEmail />. We act on requests within
          30 days, apart from the records described above.
        </p>

        <h3 className="font-medium text-forest">Limited Use</h3>
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
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          We retain student information for as long as necessary to provide our services. If you
          would like your information updated or removed from our records, please contact us at{" "}
          <ContactEmail />. We act on requests within 30 days, keeping only the records we need
          for payments, refunds and tutor pay, or that the law requires.
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
