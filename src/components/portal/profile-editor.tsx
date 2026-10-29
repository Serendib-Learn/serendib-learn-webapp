"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { CharacterPicker } from "@/components/portal/character-picker";
import { PhotoField } from "@/components/portal/photo-field";
import { useAction } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import type { LanguageCode, User } from "@/lib/types";

/**
 * Edits one account's profile. Used by a member on their own profile page,
 * and by an administrator filling in a tutor's details for them. Tutors get
 * the public-profile fields too: these are exactly what the tutors page shows.
 */
export function ProfileEditor({ user, onSaved }: { user: User; onSaved?: (user: User) => void }) {
  const isTutor = user.role === "tutor";
  const [name, setName] = useState(user.name);
  const [languages, setLanguages] = useState<LanguageCode[]>(user.languages);
  const [timezone, setTimezone] = useState(user.timezone);
  const [headline, setHeadline] = useState(user.headline ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [homeTown, setHomeTown] = useState(user.homeTown ?? "");
  const [yearsTeaching, setYearsTeaching] = useState(
    user.yearsTeaching !== undefined ? String(user.yearsTeaching) : "",
  );
  const [rate, setRate] = useState(user.hourlyRateUsd !== undefined ? String(user.hourlyRateUsd) : "");
  const [specialties, setSpecialties] = useState((user.specialties ?? []).join(", "));
  const [avatarId, setAvatarId] = useState<string | undefined>(user.avatarId);
  const [openToPractice, setOpenToPractice] = useState(user.openToPractice !== false);
  const [saved, setSaved] = useState(false);

  const save = useAction(() =>
    api.users.update(user.id, {
      name: name.trim(),
      languages,
      timezone: timezone.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      homeTown: homeTown.trim(),
      ...(avatarId ? { avatarId } : {}),
      ...(user.role === "student" ? { openToPractice } : {}),
      ...(isTutor
        ? {
            yearsTeaching: yearsTeaching ? Number(yearsTeaching) : undefined,
            hourlyRateUsd: rate ? Number(rate) : undefined,
            specialties: specialties
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }
        : {}),
    }),
  );

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaved(false);
        const result = await save.run();
        if (result) {
          setSaved(true);
          onSaved?.(result);
        }
      }}
    >
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink-700">Your photo</legend>
        <PhotoField user={user} />
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink-700">
          Your character <span className="font-normal text-ink-400">— shown when you have no photo</span>
        </legend>
        <CharacterPicker value={avatarId} onChange={setAvatarId} languages={languages} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="profile-name">
          <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Timezone" htmlFor="profile-timezone" hint="Lesson times are shown in this zone.">
          <Input
            id="profile-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="Europe/London"
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-700">
          {isTutor ? "Languages you teach" : "Languages you are learning"}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["sinhala", "tamil"] as LanguageCode[]).map((language) => (
            <Checkbox
              key={language}
              label={language === "sinhala" ? "Sinhala" : "Tamil"}
              checked={languages.includes(language)}
              onChange={() =>
                setLanguages((current) =>
                  current.includes(language)
                    ? current.filter((value) => value !== language)
                    : [...current, language],
                )
              }
            />
          ))}
        </div>
      </fieldset>

      <Field
        label={isTutor ? "Headline" : "A line about you"}
        htmlFor="profile-headline"
        hint={isTutor ? "Shown in quotes at the top of your public profile." : "Shown to other members in the community."}
      >
        <Input
          id="profile-headline"
          maxLength={140}
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          placeholder={isTutor ? "Spoken Sinhala first, the way families actually talk" : "Learning Tamil before the family wedding"}
        />
      </Field>

      <Field
        label={isTutor ? "About you" : "About you (optional)"}
        htmlFor="profile-bio"
        hint={isTutor ? "Where you are from, who you have taught, and what a lesson with you is like." : undefined}
      >
        <Textarea
          id="profile-bio"
          maxLength={2000}
          className="min-h-36"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </Field>

      <div className={isTutor ? "grid gap-5 sm:grid-cols-3" : "grid gap-5 sm:grid-cols-2"}>
        <Field label={isTutor ? "Home town" : "Where you live"} htmlFor="profile-hometown">
          <Input id="profile-hometown" value={homeTown} onChange={(event) => setHomeTown(event.target.value)} />
        </Field>
        {isTutor ? (
          <>
            <Field label="Years teaching" htmlFor="profile-years">
              <Input
                id="profile-years"
                type="number"
                min={0}
                max={70}
                value={yearsTeaching}
                onChange={(event) => setYearsTeaching(event.target.value)}
              />
            </Field>
            <Field label="Hourly rate (USD)" htmlFor="profile-rate">
              <Input
                id="profile-rate"
                type="number"
                min={5}
                max={500}
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </Field>
          </>
        ) : null}
      </div>

      {isTutor ? (
        <Field
          label="Specialties"
          htmlFor="profile-specialties"
          hint="Comma separated, up to eight. Shown as tags on your profile."
        >
          <Input
            id="profile-specialties"
            value={specialties}
            onChange={(event) => setSpecialties(event.target.value)}
            placeholder="Heritage learners, Children, Reading and writing"
          />
        </Field>
      ) : null}

      {user.role === "student" ? (
        <Checkbox
          label={
            <>
              <span className="font-medium">Show me in practice partners.</span>{" "}
              <span className="text-ink-500">
                Other vetted learners can find you in the community and send you a friend request.
                Only your name, character, languages, headline and home town are shown.
              </span>
            </>
          }
          checked={openToPractice}
          onChange={(event) => setOpenToPractice(event.target.checked)}
        />
      ) : null}

      {save.error ? <Alert>{save.error}</Alert> : null}
      {saved && !save.pending ? <Alert tone="jade">Saved.</Alert> : null}

      <Button type="submit" disabled={save.pending || languages.length === 0 || !name.trim()}>
        {save.pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
