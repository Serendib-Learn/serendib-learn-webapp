"use client";

import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { buttonClasses } from "@/components/ui/button";
import { Card, Loading } from "@/components/ui/primitives";

/**
 * Lets a tutor link a Google account so confirmed bookings get a real
 * Calendar event with a Google Meet link, instead of the placeholder link.
 * Connecting is a full-page redirect to Google's consent screen, not a
 * fetch — there is no XHR equivalent for "the user has to see this screen".
 */
export function GoogleCalendarConnect() {
  const status = useQuery(() => api.integrations.google.status(), []);
  const disconnect = useAction(() => api.integrations.google.disconnect());

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Google Calendar</h2>
      </div>

      {status.loading ? (
        <Loading label="Checking connection" />
      ) : status.data?.connected ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Connected as <span className="font-medium text-ink-800">{status.data.email}</span>.
            Confirmed bookings get a real Calendar event with a Google Meet link, and both
            sides get the invite by email.
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
            Connect your Google account so confirmed bookings create a real Calendar event
            with a Google Meet link, sent to you and your student automatically.
          </p>
          <a href={api.integrations.google.connectUrl()} className={buttonClasses("secondary", "sm", "mt-4")}>
            Connect Google Calendar
          </a>
        </>
      )}
    </Card>
  );
}
