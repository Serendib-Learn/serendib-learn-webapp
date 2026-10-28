"use client";

import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { buttonClasses } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { GoogleConnectButton } from "./google-connect-button";
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
  const { confirm, dialog } = useConfirm();

  return (
    <Card className="p-6">
      {dialog}
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
            onClick={async () => {
                const yes = await confirm({
                  title: "Disconnect your Google Calendar?",
                  message: "New bookings are made on the shared Serendib calendar instead (or need a link added by hand). Existing lessons keep their links.",
                  confirmLabel: "Disconnect calendar",
                });
                if (yes) void disconnect.run();
              }}
            className={buttonClasses("danger-ghost", "sm", "mt-4")}
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
          <GoogleConnectButton getUrl={api.integrations.google.connectUrl} className="mt-4">
            Connect Google Calendar
          </GoogleConnectButton>
        </>
      )}
    </Card>
  );
}
