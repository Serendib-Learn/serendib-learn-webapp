"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/primitives";
import type { User } from "@/lib/types";

/** Mirrors the minimum in server/src/routes/help.ts. */
const MIN_CHARS = 10;

/**
 * "Questions or concerns?" on the calendar: feedback any time, instead of
 * after every lesson. It lands in Administration → Inbox as feedback, and the
 * team replies by email.
 */
export function FeedbackForm({ user }: { user: User }) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const send = useAction(() =>
    api.help.ask({ kind: "feedback", name: user.name, email: user.email, question: message.trim(), page: pathname }),
  );
  const count = message.trim().length;

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl text-forest">Questions or concerns?</h2>
      {sent ? (
        <div className="mt-3 space-y-3">
          <Alert tone="jade">Thanks, the team has it and will reply to {user.email}.</Alert>
          <Button variant="secondary" size="sm" onClick={() => setSent(false)}>
            Send something else
          </Button>
        </div>
      ) : (
        <form
          className="mt-1.5 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await send.run()) {
              setMessage("");
              setSent(true);
            }
          }}
        >
          <p className="text-sm leading-relaxed text-ink-500">
            Submit your feedback here. It goes straight to the Serendib team, who read every message
            and reply by email.
          </p>
          <Field
            label="Your message"
            htmlFor="calendar-feedback"
            hint={count >= MIN_CHARS ? undefined : `At least ${MIN_CHARS} characters to send (${count}/${MIN_CHARS}).`}
          >
            <Textarea
              id="calendar-feedback"
              className="min-h-24"
              maxLength={3000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="A question, a suggestion, or something that isn't working for you."
            />
          </Field>
          {send.error ? <Alert>{send.error}</Alert> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={send.pending || count < MIN_CHARS}>
              {send.pending ? "Sending…" : "Send to the team"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
