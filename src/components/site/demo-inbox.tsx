"use client";

import Link from "next/link";
import { useState } from "react";
import { api, resetDatabase } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

const kindTone = {
  verification: "saffron",
  password_reset: "clay",
  welcome: "jade",
  receipt: "ocean",
  notification: "neutral",
} as const;

const kindLabel = {
  verification: "Confirm email",
  password_reset: "Password reset",
  welcome: "Welcome",
  receipt: "Receipt",
  notification: "Notification",
} as const;

/**
 * Stands in for the transactional email provider. Everything the app would
 * send by email lands here instead, so verification codes and reset links are
 * reachable while the backend is a mock.
 */
export function DemoInbox() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: mail } = useQuery(() => api.mail.inbox(), []);

  const messages = mail ?? [];
  const unread = messages.filter((message) => !message.read).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full bg-ink-900 py-2.5 pr-4 pl-3 text-sm font-medium text-sand-50 shadow-lifted transition hover:bg-ink-800",
          open && "bg-ink-800",
        )}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3.5 7.5 12 13l8.5-5.5" strokeLinecap="round" />
        </svg>
        Demo inbox
        {unread > 0 ? (
          <span className="grid size-5 place-items-center rounded-full bg-saffron-400 text-[0.68rem] font-bold text-ink-900">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed right-4 bottom-18 z-50 flex max-h-[70vh] w-[min(26rem,calc(100vw-2rem))] animate-rise flex-col overflow-hidden rounded-2xl bg-white shadow-lifted ring-1 ring-ink-900/10">
          <div className="border-b border-ink-900/8 bg-sand-100/70 px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Demo inbox</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
              This prototype has no mail server, so confirmation codes and reset links
              arrive here instead.
            </p>
          </div>

          <div className="flex-1 divide-y divide-ink-900/6 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-ink-400">
                Nothing yet. Sign up or reset a password and it will show up here.
              </p>
            ) : (
              messages.map((message) => {
                const isOpen = expanded === message.id;
                return (
                  <div key={message.id} className={cn(!message.read && "bg-saffron-50/40")}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-sand-50"
                      onClick={() => {
                        setExpanded(isOpen ? null : message.id);
                        if (!message.read) void api.mail.markRead(message.id);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge tone={kindTone[message.kind]}>{kindLabel[message.kind]}</Badge>
                          <span className="text-[0.7rem] text-ink-400">
                            {relativeTime(message.sentAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-sm font-medium text-ink-900">
                          {message.subject}
                        </p>
                        <p className="truncate text-xs text-ink-400">to {message.to}</p>
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="space-y-3 px-4 pb-4">
                        <p className="whitespace-pre-line rounded-xl bg-sand-100/80 px-3.5 py-3 text-sm leading-relaxed text-ink-700">
                          {message.body}
                        </p>

                        {message.code ? (
                          <div className="flex items-center justify-between rounded-xl bg-jade-50 px-3.5 py-3 ring-1 ring-inset ring-jade-200">
                            <div>
                              <p className="text-xs text-jade-700">Confirmation code</p>
                              <p className="font-mono text-xl font-bold tracking-[0.2em] text-jade-700">
                                {message.code}
                              </p>
                            </div>
                            <Link
                              href={`/portal/verify?email=${encodeURIComponent(message.to)}`}
                              className="text-sm font-medium text-jade-700 underline decoration-jade-300 underline-offset-4"
                              onClick={() => setOpen(false)}
                            >
                              Use it
                            </Link>
                          </div>
                        ) : null}

                        {message.token ? (
                          <Link
                            href={`/portal/reset-password?token=${message.token}`}
                            className="block rounded-xl bg-clay-50 px-3.5 py-3 text-sm font-medium text-clay-600 ring-1 ring-inset ring-clay-100"
                            onClick={() => setOpen(false)}
                          >
                            Open the reset link →
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-ink-900/8 bg-sand-100/70 px-3 py-2.5">
            <Button variant="ghost" size="sm" onClick={() => void api.mail.clear()}>
              Clear inbox
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-clay-600 hover:bg-clay-50"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all demo data? Accounts, bookings and posts go back to the seeded state.",
                  )
                ) {
                      void resetDatabase();
                }
              }}
            >
              Reset demo data
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
