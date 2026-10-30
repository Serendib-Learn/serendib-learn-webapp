import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Card, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { fetchLessonPriceLkr, fetchPublicTutors, profilePhotoUrl } from "@/lib/api/public";
import { lkr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Tutors",
  description:
    "The Sinhala and Tamil tutors at Serendib Learn — who they are, where they are from, and what they are best at teaching.",
};

// Re-read the roster at most once a minute, so a newly approved tutor or an
// edited profile shows up without a redeploy.
export const revalidate = 60;

export default async function TutorsPage() {
  const [tutors, lessonPrice] = await Promise.all([fetchPublicTutors(), fetchLessonPriceLkr()]);

  return (
    <>
      <section className="bg-weave border-b border-ink-900/8">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="label-eyebrow">Tutors</p>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-5xl">
            Everyone here grew up speaking it.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            Every tutor is interviewed by us before they join — we assess fluency, warmth
            and reliability, and keep the roster small so that we know every person on it.
            If none of them fit, tell us and we will find someone who does.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        {tutors.length === 0 ? (
          <EmptyState
            icon="🧑‍🏫"
            title="Our tutors are being introduced"
            action={<ButtonLink href="/#waitlist">Register your interest</ButtonLink>}
          >
            We are onboarding our first tutors now. Register your interest and we will match
            you personally as soon as the right person is on board.
          </EmptyState>
        ) : (
          <div className="space-y-8">
            {tutors.map((tutor) => (
              <Card key={tutor.id} className="grid gap-8 p-8 md:grid-cols-[auto_1fr] md:p-10">
                <div className="flex items-start gap-4 md:w-56 md:flex-col">
                  <Avatar
                    name={tutor.name}
                    avatarId={tutor.avatarId}
                    photoUrl={tutor.photoId ? profilePhotoUrl(tutor.id, tutor.photoId) : undefined}
                    size="2xl"
                  />
                  <div>
                    <h2 className="text-xl leading-tight">{tutor.name}</h2>
                    {tutor.homeTown ? (
                      <p className="mt-1 text-sm text-ink-400">{tutor.homeTown}</p>
                    ) : null}
                    {lessonPrice ? (
                      <p className="mt-4 text-sm font-medium text-ink-700">
                        {lkr(lessonPrice)}
                        <span className="font-normal text-ink-400"> / lesson</span>
                      </p>
                    ) : null}
                    {tutor.yearsTeaching ? (
                      <p className="text-xs text-ink-400">{tutor.yearsTeaching} years teaching</p>
                    ) : null}
                  </div>
                </div>

                <div>
                  {tutor.headline ? (
                    <p className="font-display text-xl leading-snug text-ink-800">
                      &ldquo;{tutor.headline}&rdquo;
                    </p>
                  ) : null}
                  {tutor.bio ? (
                    <p className="mt-4 max-w-2xl leading-relaxed whitespace-pre-line text-ink-600">
                      {tutor.bio}
                    </p>
                  ) : null}

                  <div className="mt-7 flex flex-wrap items-center gap-2">
                    {tutor.languages.map((language) => (
                      <Badge key={language} tone={language === "sinhala" ? "jade" : "clay"}>
                        {language === "sinhala" ? "Sinhala" : "Tamil"}
                      </Badge>
                    ))}
                    {(tutor.specialties ?? []).map((subject) => (
                      <Badge key={subject}>{subject}</Badge>
                    ))}
                  </div>

                  {tutor.bookable ? (
                    <div className="mt-8 flex flex-wrap gap-3 border-t border-ink-900/8 pt-6">
                      <ButtonLink href={`/portal/calendar?tutor=${tutor.id}`} size="sm">
                        See {tutor.name.split(" ")[0]}&rsquo;s availability
                      </ButtonLink>
                      <ButtonLink href="/portal/signup" variant="secondary" size="sm">
                        Create an account first
                      </ButtonLink>
                    </div>
                  ) : (
                    // Listed before their account is set up: no hours to book yet.
                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink-900/8 pt-6">
                      <ButtonLink href="/#waitlist" size="sm">
                        Ask for a lesson with {tutor.name.split(" ")[0]}
                      </ButtonLink>
                      <p className="text-sm text-ink-400">
                        Online booking with {tutor.name.split(" ")[0]} opens soon.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-ink-900/8 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="Teaching with us" title="Are you a tutor in Sri Lanka?">
            We are always looking for people who can teach the language they grew up
            speaking. Apply with a tutor account and we will be in touch to talk it through
            before any student can book you.
          </SectionHeading>
          <ButtonLink href="/portal/signup?role=tutor" className="mt-8">
            Apply as a tutor
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
