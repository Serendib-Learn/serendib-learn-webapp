"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { buttonClasses } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { GoogleConnectButton } from "./google-connect-button";
import { Card, Loading } from "@/components/ui/primitives";

/**
 * Admin-only: connects the one Google account that sends the site's mail
 * (verification codes, receipts, welcomes) through Gmail. Separate from a
 * tutor's own Calendar connection — this is site-wide, not per-user.
 */
export function GoogleMailConnect() {
  const status = useQuery(() => api.integrations.google.mailStatus(), []);
  const disconnect = useAction(() => api.integrations.google.mailDisconnect());
  const { confirm, dialog } = useConfirm();
  const test = useAction(() => api.integrations.google.testMail());
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <Card className="p-6">
      {dialog}
      <h2 className="text-lg">Outgoing mail</h2>

      {status.loading ? (
        <Loading label="Checking connection" />
      ) : status.data?.connected ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Verification codes, receipts, lesson reminders and notifications send for real
            through <span className="font-medium text-ink-800">{status.data.email}</span>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={test.pending}
              onClick={async () => {
                setSentTo(null);
                const sent = await test.run();
                if (sent) setSentTo(sent.sentTo);
              }}
              className={buttonClasses("secondary", "sm")}
            >
              {test.pending ? "Sending…" : "Send a test email"}
            </button>
            <button
              type="button"
              disabled={disconnect.pending}
              onClick={async () => {
                const yes = await confirm({
                  title: "Disconnect Gmail?",
                  message: "Emails stop reaching real inboxes straight away — verification codes, receipts and reminders only go to the log until you connect it again.",
                  confirmLabel: "Disconnect Gmail",
                });
                if (yes) void disconnect.run();
              }}
              className={buttonClasses("danger-ghost", "sm")}
            >
              Disconnect
            </button>
          </div>
          {sentTo ? (
            <p className="mt-3 text-sm text-fern">Sent — check the inbox of {sentTo}.</p>
          ) : null}
          {test.error ? <p className="mt-3 text-sm text-clay-600">{test.error}</p> : null}
          {disconnect.error ? (
            <p className="mt-2 text-sm text-clay-600">{disconnect.error}</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Not connected — no email reaches a real inbox: not verification codes, receipts
            or lesson reminders. Connect the Serendib Google account to send them over Gmail.
          </p>
          <GoogleConnectButton getUrl={api.integrations.google.mailConnectUrl} className="mt-4">
            Connect Gmail
          </GoogleConnectButton>
        </>
      )}
    </Card>
  );
}
