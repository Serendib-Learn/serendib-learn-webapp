"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard, AuthFooterLink } from "@/components/portal/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const { run, pending, error } = useAction(api.auth.resetPassword);

  const mismatch = confirmation.length > 0 && password !== confirmation;

  return (
    <AuthCard
      title="Choose a new password"
      intro="Once this is set you will be logged straight in. The link stops working afterwards."
      footer={<AuthFooterLink label="Wrong link?" href="/portal/forgot-password" cta="Send a new one" />}
    >
      {!token ? (
        <Alert>
          This page needs a reset link. Request one from the forgotten password screen and
          open it from the demo inbox.
        </Alert>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (mismatch) return;
            const user = await run(token, password);
            if (user) router.push("/portal");
          }}
        >
          <Field label="New password" htmlFor="rp-password" hint="At least 8 characters.">
            <Input
              id="rp-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Field label="Again, to be sure" htmlFor="rp-confirm">
            <Input
              id="rp-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </Field>

          {mismatch ? <Alert tone="saffron">Those two do not match.</Alert> : null}
          {error ? <Alert>{error}</Alert> : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending || mismatch}>
            {pending ? "Saving…" : "Set password and log in"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-weave min-h-[calc(100vh-4rem)]" />}>
      <ResetForm />
    </Suspense>
  );
}
