"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AuthCard, AuthFooterLink } from "@/components/portal/auth-card";
import { GoogleButton } from "@/components/portal/google-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/primitives";
import { ApiError, DEMO_PASSWORD, api, demoAccounts } from "@/lib/api";
import { useAction, useQuery, useTimezone } from "@/lib/hooks";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { run, pending, error } = useAction(api.auth.signIn);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const timezone = useTimezone();
  // The seeded accounts only exist in demo mode, so only offer them then.
  const { data: health } = useQuery(() => api.health(), []);
  const demoMode = health?.demoMode === true;

  const signInWithGoogle = async (credential: string) => {
    setGoogleError(null);

    try {
      await api.auth.withGoogle({
        credential,
        intent: "login",
        timezone: timezone || "UTC",
      });
      router.push("/portal");
    } catch (failure) {
      // Nobody has signed up with this Google address yet, and signup needs to
      // know whether they are here to learn or to teach.
      if (failure instanceof ApiError && failure.code === "no_account") {
        router.push("/portal/signup?google=new");
        return;
      }
      setGoogleError(failure instanceof Error ? failure.message : "That did not work.");
    }
  };

  return (
    <AuthCard
      title="serendib.learn"
      intro="Portal for students, families and tutors"
      footer={
        <>
          <AuthFooterLink label="No account yet?" href="/portal/signup" cta="Create one" />
          <AuthFooterLink label="Forgotten your password?" href="/portal/forgot-password" cta="Reset it" />
          <p>
            Questions? Email{" "}
            <a href="mailto:serendib.learn@gmail.com" className="text-amber-spice underline">
              serendib.learn@gmail.com
            </a>
          </p>
        </>
      }
      aside={
        <Card className="p-6">
          {demoMode ? (
            <>
              <p className="text-sm font-semibold text-ink-900">Demo accounts</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                This prototype ships with seeded accounts so you can see each role. The
                password for all of them is{" "}
                <code className="rounded bg-sand-100 px-1.5 py-0.5 font-mono text-[0.7rem]">
                  {DEMO_PASSWORD}
                </code>
                .
              </p>

              <ul className="mt-4 space-y-2">
                {demoAccounts.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(DEMO_PASSWORD);
                      }}
                      className="w-full rounded-xl bg-sand-100/70 px-3.5 py-3 text-left border border-forest/8 transition hover:bg-jade-50 hover:ring-jade-200"
                    >
                      <span className="block text-sm font-medium text-ink-800">{account.role}</span>
                      <span className="block truncate text-xs text-ink-400">{account.email}</span>
                      <span className="mt-1 block text-xs leading-snug text-ink-500">
                        {account.note}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm font-semibold text-ink-900">New to Serendib Learn?</p>
          )}

          <div className={`space-y-2 text-xs leading-relaxed text-ink-500 ${demoMode ? "mt-4 border-t border-ink-900/8 pt-4" : "mt-3"}`}>
            <p>
              New here to learn?{" "}
              <Link
                href="/portal/signup"
                className="font-medium text-jade-700 underline decoration-jade-200 underline-offset-2"
              >
                Create a student account
              </Link>
            </p>
            <p>
              Want to teach?{" "}
              <Link
                href="/portal/signup?role=tutor"
                className="font-medium text-jade-700 underline decoration-jade-200 underline-offset-2"
              >
                Apply as a tutor
              </Link>
            </p>
          </div>
        </Card>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const user = await run(email, password);
          if (user) router.push("/portal");
        }}
      >
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error ? <Alert>{error}</Alert> : null}
        {googleError ? <Alert>{googleError}</Alert> : null}

        <Button type="submit" variant="forest" className="w-full rounded-lg" disabled={pending}>
          {pending ? "Logging in…" : "Enter portal"}
        </Button>
      </form>

      <div className="mt-6">
        <GoogleButton text="continue_with" onCredential={signInWithGoogle} />
      </div>
    </AuthCard>
  );
}
