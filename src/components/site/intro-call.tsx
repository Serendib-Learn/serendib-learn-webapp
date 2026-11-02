"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/primitives";
import { turnstileAvailable, TurnstileWidget } from "@/components/ui/turnstile-widget";

/**
 * "Book your free intro call": a request for a call with the Serendib team,
 * who help choose a tutor and a plan. It goes to Administration → Inbox (as
 * an intro call), and the team arranges a time on WhatsApp or by email.
 */
export function IntroCallButton({
  className,
  children = "Book your free intro call",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? <IntroCallDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function IntroCallDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [goodTimes, setGoodTimes] = useState("");
  const [about, setAbout] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const send = useAction(api.help.ask);
  // Signed-in people have already shown they're human.
  const needsCaptcha = turnstileAvailable && !user;

  return (
    <Modal
      open
      onClose={onClose}
      title={sentTo ? "Thanks, we've got it" : "Book your free intro call"}
      description={
        sentTo
          ? undefined
          : "A short, free call with the Serendib team to find the right tutor and the plan that suits you. Nothing to pay."
      }
    >
      {sentTo ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto size-8 text-jade-600" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-600">
            Someone from the team will be in touch on WhatsApp or at {sentTo}, usually within a day, to set a
            time.
          </p>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const sent = await send.run({
              kind: "intro_call",
              name,
              email,
              phone,
              goodTimes,
              question: about,
              page: window.location.pathname,
              turnstileToken: turnstileToken ?? undefined,
            });
            if (sent) setSentTo(sent.email);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name" htmlFor="intro-name">
              <Input id="intro-name" required maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Email" htmlFor="intro-email">
              <Input id="intro-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
          </div>
          <Field label="WhatsApp number" htmlFor="intro-phone" hint="With the country code, e.g. +44 7700 900123.">
            <Input
              id="intro-phone"
              type="tel"
              required
              maxLength={40}
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
          <Field label="Good days and times" htmlFor="intro-times" hint="In your own timezone, e.g. weekday evenings after 6pm UK time.">
            <Input id="intro-times" maxLength={300} value={goodTimes} onChange={(event) => setGoodTimes(event.target.value)} />
          </Field>
          <Field label="What would you like to learn? (optional)" htmlFor="intro-about">
            <Textarea
              id="intro-about"
              className="min-h-20"
              maxLength={3000}
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              placeholder="Sinhala for my kids, Tamil to talk to my grandmother, getting ready for a move…"
            />
          </Field>
          {needsCaptcha ? <TurnstileWidget onToken={setTurnstileToken} /> : null}
          {send.error ? <Alert>{send.error}</Alert> : null}
          <Button
            type="submit"
            variant="forest"
            className="w-full"
            disabled={send.pending || (needsCaptcha && !turnstileToken)}
          >
            {send.pending ? "Sending…" : "Request my intro call"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
