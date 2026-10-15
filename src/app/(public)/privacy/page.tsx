import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Serendib.learn collects, uses and protects the information of students and families.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 font-display text-lg font-semibold text-forest">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-earth/80">{children}</div>
    </section>
  );
}

const email = (
  <a href="mailto:serendib.learn@gmail.com" className="text-amber-spice underline">
    serendib.learn@gmail.com
  </a>
);

/** The original site's privacy policy, word for word, plus the services this version relies on. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="mb-6 font-display text-3xl text-forest sm:mb-8 md:text-4xl">Privacy Policy</h1>

      <p className="mb-8 text-[15px] leading-relaxed text-earth/80">
        Serendib.learn (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is committed to protecting the
        privacy of our students and their families.
      </p>

      <Section title="What we collect">
        <p>We collect personal information solely for the purposes of:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Scheduling and coordinating lessons</li>
          <li>
            Understanding individual learning goals, so we can match students with the right tutor
            and approach
          </li>
          <li>Maintaining a student database to support the ongoing delivery of our services</li>
        </ul>
      </Section>

      <Section title="How your information is used">
        <p>
          The information you provide is used only for the purposes listed above. We do not use
          your data for any purpose beyond delivering and improving our tutoring services.
        </p>
      </Section>

      <Section title="Confidentiality">
        <p>
          All personal and student information is kept strictly confidential. We do not sell, rent,
          or share your information with any third-party vendors or external organizations.
        </p>
      </Section>

      {/* Added for the portal: the services that carry out parts of a lesson on our behalf. */}
      <Section title="Services we use">
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
      </Section>

      <Section title="Data retention">
        <p>
          We retain student information for as long as necessary to provide our services. If you
          would like your information updated or removed from our records, please contact us at{" "}
          {email}.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          If you have any questions about this Privacy Policy or how your information is handled,
          please reach out to us at {email}.
        </p>
      </Section>
    </main>
  );
}
