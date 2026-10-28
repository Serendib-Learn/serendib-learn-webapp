"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { buttonClasses } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { GoogleConnectButton } from "./google-connect-button";
import { Card, Loading } from "@/components/ui/primitives";

/**
 * Admin-only: connects the Serendib Google account whose calendar makes the
 * Google Meet link for any booking whose tutor has not connected their own.
 * One connection here means every booking gets a real Meet link.
 */
export function GoogleSystemCalendarConnect() {
  const status = useQuery(() => api.integrations.google.systemCalendarStatus(), []);
  const disconnect = useAction(() => api.integrations.google.systemCalendarDisconnect());
  const { confirm, dialog } = useConfirm();
  const test = useAction(() => api.integrations.google.testSystemCalendar());
  const [result, setResult] = useState<string | null>(null);

  return (
    <Card className="p-6">
      {dialog}
      <h2 className="text-lg">Google Meet for every booking</h2>

      {status.loading ? (
        <Loading label="Checking connection" />
      ) : status.data?.connected ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Bookings with tutors who have not connected their own calendar get a Google Meet
            link from <span className="font-medium text-ink-800">{status.data.email}</span>&rsquo;s
            calendar. The tutor and student are both invited, so Google emails them the event.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={test.pending}
              onClick={async () => {
                setResult(null);
                const made = await test.run();
                if (made) setResult(made.meetLink);
              }}
              className={buttonClasses("secondary", "sm")}
            >
              {test.pending ? "Making one…" : "Make a test Meet link"}
            </button>
            <button
              type="button"
              disabled={disconnect.pending}
              onClick={async () => {
                const yes = await confirm({
                  title: "Disconnect the Serendib calendar?",
                  message: "New bookings stop getting Meet links unless their tutor has connected their own calendar. Existing lessons keep their links.",
                  confirmLabel: "Disconnect calendar",
                });
                if (yes) void disconnect.run();
              }}
              className={buttonClasses("danger-ghost", "sm")}
            >
              Disconnect
            </button>
          </div>
          {result ? (
            <p className="mt-3 text-sm text-fern">
              It works: Google made <span className="font-medium">{result}</span> (a throwaway
              event, already deleted). Every new booking now gets its own link like this.
            </p>
          ) : null}
          {test.error ? <p className="mt-3 text-sm text-clay-600">{test.error}</p> : null}
          {disconnect.error ? (
            <p className="mt-2 text-sm text-clay-600">{disconnect.error}</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Not connected. Tutors who connect Google Calendar (Calendar → My hours) get Meet
            links on their own calendar; everyone else&rsquo;s bookings have no link until the
            tutor adds one by hand. Connect the Serendib Google account here and every booking
            gets a Meet link automatically.
          </p>
          <GoogleConnectButton getUrl={api.integrations.google.systemCalendarConnectUrl} className="mt-4">
            Connect the Serendib calendar
          </GoogleConnectButton>
        </>
      )}
    </Card>
  );
}
