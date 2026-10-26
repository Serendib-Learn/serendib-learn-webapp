"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard } from "@/components/portal/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  const verify = useAction(api.auth.verifyEmail);
  const resend = useAction(api.auth.resendVerification);
  const { data: health } = useQuery(() => api.health(), []);
  const demoMode = health?.demoMode === true;

  return (
    <AuthCard
      title="Confirm your email"
      intro="We sent a six digit code. Enter it below and your account is live."
      aside={
        <Card className="p-6">
          <p className="text-sm font-semibold text-ink-900">Where is the email?</p>
          {demoMode ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              This demo has no mail server. Open the{" "}
              <span className="font-medium text-ink-800">Demo inbox</span> in the bottom
              right corner and you will find the code waiting there.
            </p>
          ) : (
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-500">
              <p>
                It comes from serendib.learn@gmail.com and usually arrives within a minute.
                Yahoo, Outlook and Hotmail sometimes file it under{" "}
                <span className="font-medium text-ink-800">Spam</span> or{" "}
                <span className="font-medium text-ink-800">Junk</span> — please look there too.
              </p>
              <p>
                Still nothing after a few minutes? Email{" "}
                <a href="mailto:serendib.learn@gmail.com" className="text-amber-spice underline">
                  serendib.learn@gmail.com
                </a>{" "}
                from the address you signed up with and we will confirm it for you.
              </p>
            </div>
          )}
        </Card>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const user = await verify.run(email, code);
          if (user) router.push("/portal");
        }}
      >
        <Field label="Email" htmlFor="vf-email">
          <Input
            id="vf-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Confirmation code" htmlFor="vf-code">
          <Input
            id="vf-code"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="text-center font-mono text-2xl tracking-[0.4em]"
          />
        </Field>

        {verify.error ? <Alert>{verify.error}</Alert> : null}
        {resend.error ? <Alert>{resend.error}</Alert> : null}
        {resent ? (
          <Alert tone="jade">
            {demoMode ? "A new code is in the demo inbox." : "A new code is on its way — check your inbox and spam folder."}
          </Alert>
        ) : null}

        <Button type="submit" variant="forest" className="w-full rounded-lg" disabled={verify.pending}>
          {verify.pending ? "Checking…" : "Confirm and continue"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={resend.pending || !email}
          onClick={async () => {
            setResent(false);
            const result = await resend.run(email);
            if (result !== undefined) setResent(true);
          }}
        >
          {resend.pending ? "Sending…" : "Send me a new code"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="bg-weave min-h-[calc(100vh-4rem)]" />}>
      <VerifyForm />
    </Suspense>
  );
}
