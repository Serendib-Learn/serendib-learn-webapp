"use client";

import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { buttonClasses } from "@/components/ui/button";
import { Card, Loading } from "@/components/ui/primitives";

/**
 * Admin-only: connects the Serendib Google account whose calendar makes the
 * Google Meet link for any booking whose tutor has not connected their own.
 * One connection here means every booking gets a real Meet link.
 */
export function GoogleSystemCalendarConnect() {
  const status = useQuery(() => api.integrations.google.systemCalendarStatus(), []);
  const disconnect = useAction(() => api.integrations.google.systemCalendarDisconnect());

  return (
    <Card className="p-6">
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
            Not connected. Tutors who connect Google Calendar (Calendar → My hours) get Meet
            links on their own calendar; everyone else&rsquo;s bookings have no link until the
            tutor adds one by hand. Connect the Serendib Google account here and every booking
            gets a Meet link automatically.
          </p>
          <a
            href={api.integrations.google.systemCalendarConnectUrl()}
            className={buttonClasses("secondary", "sm", "mt-4")}
          >
            Connect the Serendib calendar
          </a>
        </>
      )}
    </Card>
  );
}
