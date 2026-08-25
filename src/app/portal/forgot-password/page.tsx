"use client";

import { useState } from "react";
import { AuthCard, AuthFooterLink } from "@/components/portal/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { run, pending, error } = useAction(api.auth.requestPasswordReset);

  return (
    <AuthCard
      title="Reset your password"
      intro="Give us the address on your account and we will send a link to set a new password."
      footer={<AuthFooterLink label="Remembered it?" href="/portal/login" cta="Back to log in" />}
      aside={
        <Card className="p-6">
          <p className="text-sm font-semibold text-ink-900">A note on this screen</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            We give the same answer whether or not the address has an account, so this
            form cannot be used to find out who has signed up.
          </p>
        </Card>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <Alert tone="jade">
            If that address has an account, a reset link is on its way. Open the demo
            inbox in the bottom right corner to follow it.
          </Alert>
          <Button variant="secondary" className="w-full" onClick={() => setSent(false)}>
            Use a different address
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await run(email);
            if (result !== undefined) setSent(true);
          }}
        >
          <Field label="Email" htmlFor="fp-email">
            <Input
              id="fp-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </Field>

          {error ? <Alert>{error}</Alert> : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send the reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
