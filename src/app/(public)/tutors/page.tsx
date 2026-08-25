import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Card, SectionHeading } from "@/components/ui/primitives";
import { tutorProfiles } from "@/data/tutors";

export const metadata: Metadata = {
  title: "Tutors",
  description:
    "The Sinhala and Tamil tutors at Serendib Learn — who they are, where they are from, and what they are best at teaching.",
};

export default function TutorsPage() {
  return (
    <>
      <section className="bg-weave border-b border-ink-900/8">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <Badge tone="jade">Tutors</Badge>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-5xl">
            Everyone here grew up speaking it.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            We keep the roster small so that we have actually met and taught alongside
            every person on it. If none of them fit, tell us and we will find someone who
            does rather than push you at whoever is free.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="space-y-8">
          {tutorProfiles.map((tutor) => (
            <Card key={tutor.id} className="grid gap-8 p-8 md:grid-cols-[auto_1fr] md:p-10">
              <div className="flex items-start gap-4 md:w-56 md:flex-col">
                <Avatar name={tutor.name} size="lg" />
                <div>
                  <h2 className="text-xl leading-tight">{tutor.name}</h2>
                  <p className="mt-1 text-sm text-ink-400">{tutor.homeTown}</p>
                  <p className="mt-4 text-sm font-medium text-ink-700">
                    ${tutor.hourlyRateUsd}
                    <span className="font-normal text-ink-400"> / hour</span>
                  </p>
                  <p className="text-xs text-ink-400">{tutor.yearsTeaching} years teaching</p>
                </div>
              </div>

              <div>
                <p className="font-display text-xl leading-snug text-ink-800">
                  &ldquo;{tutor.headline}&rdquo;
                </p>
                <p className="mt-4 max-w-2xl leading-relaxed text-ink-600">{tutor.bio}</p>

                <div className="mt-7 flex flex-wrap items-center gap-2">
                  {tutor.languages.map((language) => (
                    <Badge key={language} tone={language === "sinhala" ? "jade" : "clay"}>
                      {language === "sinhala" ? "Sinhala" : "Tamil"}
                    </Badge>
                  ))}
                  {tutor.teaches.map((subject) => (
                    <Badge key={subject}>{subject}</Badge>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3 border-t border-ink-900/8 pt-6">
                  <ButtonLink href="/portal/calendar" size="sm">
                    See {tutor.name.split(" ")[0]}&rsquo;s availability
                  </ButtonLink>
                  <ButtonLink href="/portal/signup" variant="secondary" size="sm">
                    Create an account first
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-900/8 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="Teaching with us" title="Are you a tutor in Sri Lanka?">
            We are always looking for people who can teach the language they grew up
            speaking. Create a tutor account, set your availability, and we will be in
            touch to talk it through before any student can book you.
          </SectionHeading>
          <ButtonLink href="/portal/signup" className="mt-8">
            Apply as a tutor
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
