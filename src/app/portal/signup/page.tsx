"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard, AuthFooterLink } from "@/components/portal/auth-card";
import { GoogleButton } from "@/components/portal/google-button";
import { Button } from "@/components/ui/button";
import { Field, Input, Radio } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/primitives";
import { turnstileAvailable, TurnstileWidget } from "@/components/ui/turnstile-widget";
import { api } from "@/lib/api";
import { useAction, useTimezone } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import type { LanguageCode } from "@/lib/types";

const roleOptions = [
  {
    value: "student" as const,
    title: "I want to learn",
    body: "Book tutors, get materials and homework, and join the community.",
  },
  {
    value: "tutor" as const,
    title: "I want to teach",
    body: "Publish your availability, upload material, and assign it to your tutees.",
  },
];

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"student" | "tutor">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [languages, setLanguages] = useState<LanguageCode[]>(["sinhala"]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const timezone = useTimezone();

  const { run, pending, error } = useAction(api.auth.signUp);
  const [googleError, setGoogleError] = useState<string | null>(null);

  /** Set when someone was sent here from the login page's Google button. */
  const fromGoogle = searchParams.get("google") === "new";

  const signUpWithGoogle = async (credential: string) => {
    setGoogleError(null);

    try {
      await api.auth.withGoogle({
        credential,
        intent: "signup",
        role,
        languages,
        timezone: timezone || "UTC",
      });
      // Google has already confirmed the address, so there is no code to enter.
      router.push("/portal");
    } catch (failure) {
      setGoogleError(failure instanceof Error ? failure.message : "That did not work.");
    }
  };

  const toggleLanguage = (language: LanguageCode) => {
    setLanguages((current) =>
      current.includes(language)
        ? current.filter((value) => value !== language)
        : [...current, language],
    );
  };

  return (
    <AuthCard
      title="Create your account"
      intro="Two minutes, no card. You choose a tutor afterwards."
      footer={<AuthFooterLink label="Already have an account?" href="/portal/login" cta="Log in" />}
      aside={
        <Card className="p-6">
          <p className="text-sm font-semibold text-ink-900">What happens next</p>
          <ol className="mt-4 space-y-3.5">
            {[
              "We email you a six digit code to confirm the address",
              "You land in your portal, empty and waiting",
              "Pick a tutor from real availability and book an hour",
            ].map((line, index) => (
              <li key={line} className="flex gap-3 text-sm leading-snug text-ink-600">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-jade-100 text-[0.7rem] font-bold text-jade-700">
                  {index + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-ink-900/8 pt-4 text-xs leading-relaxed text-ink-400">
            Tutor accounts are reviewed by an administrator before students can book
            them.
          </p>
        </Card>
      }
    >
      {fromGoogle ? (
        <Alert tone="saffron" className="mb-6">
          Almost there. Tell us whether you are here to learn or to teach, and which
          language, then continue with Google below.
        </Alert>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await run({
            name,
            email,
            password,
            role,
            languages,
            timezone: timezone || "UTC",
            turnstileToken: turnstileToken ?? undefined,
          });
          if (result) {
            router.push(`/portal/verify?email=${encodeURIComponent(result.email)}`);
          }
        }}
      >
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink-700">
            Which are you here for?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                aria-pressed={role === option.value}
                className={cn(
                  "rounded-xl p-4 text-left ring-1 ring-inset transition",
                  role === option.value
                    ? "bg-jade-50 ring-jade-400"
                    : "bg-white ring-ink-900/10 hover:bg-sand-100",
                )}
              >
                <span className="block font-display text-base font-semibold text-ink-900">
                  {option.title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                  {option.body}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Your name" htmlFor="su-name">
          <Input
            id="su-name"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Priya Ratnam"
          />
        </Field>

        <Field label="Email" htmlFor="su-email">
          <Input
            id="su-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="Password"
          htmlFor="su-password"
          hint="At least 8 characters."
        >
          <Input
            id="su-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </Field>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink-700">
            {role === "tutor" ? "Which do you teach?" : "Which do you want to learn?"}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["sinhala", "tamil"] as LanguageCode[]).map((language) => (
              <Radio
                key={language}
                name="language"
                label={language === "sinhala" ? "Sinhala" : "Tamil"}
                checked={languages.includes(language)}
                onChange={() => toggleLanguage(language)}
                onClick={(event) => {
                  // Acts as a toggle so both languages can be selected together.
                  event.preventDefault();
                  toggleLanguage(language);
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Pick both if you want both — Dilani teaches Sinhala and Tamil together.
          </p>
        </fieldset>

        {timezone ? (
          <p className="text-xs text-ink-400">
            Times will be shown in{" "}
            <span className="font-medium text-ink-600">{timezone}</span>, detected from
            your browser.
          </p>
        ) : null}

        {turnstileAvailable ? <TurnstileWidget onToken={setTurnstileToken} /> : null}

        {error ? <Alert>{error}</Alert> : null}
        {googleError ? <Alert>{googleError}</Alert> : null}
        {languages.length === 0 ? <Alert tone="saffron">Pick at least one language.</Alert> : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || languages.length === 0 || (turnstileAvailable && !turnstileToken)}
        >
          {pending ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <div className="mt-6">
        <GoogleButton
          text="signup_with"
          disabled={languages.length === 0}
          onCredential={signUpWithGoogle}
        />
      </div>
    </AuthCard>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="bg-weave min-h-[calc(100vh-4rem)]" />}>
      <SignUpForm />
    </Suspense>
  );
}
