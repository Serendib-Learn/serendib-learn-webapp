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
            <span className="font-medium">Google</span> — if you choose to sign in with Google, and
            to create the Google Meet link and calendar invitation for each lesson.
          </li>
        </ul>
        <p>
          Lesson feedback and voice notes you record in the portal are shared only with your tutor
          and our team.
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
