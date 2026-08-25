"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import type { LanguageCode } from "@/lib/types";

export function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState<LanguageCode | "either">("sinhala");
  const [level, setLevel] = useState("none");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  const { run, pending, error } = useAction(api.waitlist.join);

  if (done) {
    return (
      <div className="rounded-2xl bg-jade-50 p-8 text-center ring-1 ring-jade-200">
        <p className="text-3xl" aria-hidden>
          🌴
        </p>
        <h3 className="mt-3 text-xl">You&rsquo;re on the list</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-600">
          We match people to tutors by hand, so give us a few days. Meanwhile the
          Survival Sri Lanka decks are free and need no account.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={() => {
            setDone(false);
            setName("");
            setEmail("");
            setReason("");
          }}
        >
          Add someone else
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await run({
          name,
          email,
          language,
          level: level as never,
          reason,
        });
        if (result) setDone(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="wl-name">
          <Input
            id="wl-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Rukshan de Silva"
            autoComplete="name"
          />
        </Field>
        <Field label="Email" htmlFor="wl-email">
          <Input
            id="wl-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Which language?" htmlFor="wl-language">
          <Select
            id="wl-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as LanguageCode | "either")}
          >
            <option value="sinhala">Sinhala</option>
            <option value="tamil">Tamil</option>
            <option value="either">Either — help me decide</option>
          </Select>
        </Field>
        <Field label="Where are you starting from?" htmlFor="wl-level">
          <Select
            id="wl-level"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="none">Complete beginner</option>
            <option value="some">I know a few words</option>
            <option value="rusty">I spoke it as a child</option>
            <option value="fluent-ish">I can talk, but can&rsquo;t read or write</option>
          </Select>
        </Field>
      </div>

      <Field
        label="Why now?"
        htmlFor="wl-reason"
        hint="A sentence is plenty. It genuinely changes which tutor we put you with."
      >
        <Textarea
          id="wl-reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="My grandmother is 84 and I have never had a proper conversation with her."
        />
      </Field>

      {error ? <Alert>{error}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Adding you…" : "Join the waitlist"}
      </Button>
      <p className="text-center text-xs text-ink-400">
        No card, no spam. We only write when we have a tutor who fits.
      </p>
    </form>
  );
}
