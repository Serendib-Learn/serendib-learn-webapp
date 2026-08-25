"use client";

import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { buttonClasses } from "@/components/ui/button";
import { Card, Loading } from "@/components/ui/primitives";

/**
 * Admin-only: connects the one Google account that sends the site's mail
 * (verification codes, receipts, welcomes) through Gmail. Separate from a
 * tutor's own Calendar connection — this is site-wide, not per-user.
 */
export function GoogleMailConnect() {
  const status = useQuery(() => api.integrations.google.mailStatus(), []);
  const disconnect = useAction(() => api.integrations.google.mailDisconnect());

  return (
    <Card className="p-6">
      <h2 className="text-lg">Outgoing mail</h2>

      {status.loading ? (
        <Loading label="Checking connection" />
      ) : status.data?.connected ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Verification codes, receipts and welcome messages send for real through{" "}
            <span className="font-medium text-ink-800">{status.data.email}</span>. They
            still also appear in the demo inbox.
          </p>
          <button
            type="button"
            disabled={disconnect.pending}
            onClick={() => void disconnect.run()}
            className={buttonClasses("ghost", "sm", "mt-4 text-clay-600 hover:bg-clay-50")}
          >
            Disconnect
          </button>
          {disconnect.error ? (
            <p className="mt-2 text-sm text-clay-600">{disconnect.error}</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Not connected — notifications only appear in the demo inbox. Connect a Google
            account to send them for real over Gmail.
          </p>
          <a
            href={api.integrations.google.mailConnectUrl()}
            className={buttonClasses("secondary", "sm", "mt-4")}
          >
            Connect Gmail
          </a>
        </>
      )}
    </Card>
  );
}
