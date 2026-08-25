"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { formatTime, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Avatar, Card, EmptyState, Loading } from "@/components/ui/primitives";
import type { User } from "@/lib/types";

export default function MessagesPage() {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);

  const threads = useQuery(
    () => (user ? api.messages.threadsFor(user.id) : Promise.resolve([])),
    [user?.id],
  );
  const contacts = useQuery(
    () =>
      !user
        ? Promise.resolve([])
        : user.role === "student"
          ? api.users.tutors()
          : api.users.tuteesOf(user.id),
    [user?.id, user?.role],
  );

  const start = useAction((otherId: string) =>
    api.messages.ensureThread(user!.id, otherId),
  );

  if (!user || threads.loading) return <Loading label="Opening your messages" />;

  const summaries = threads.data ?? [];
  const active = summaries.find((summary) => summary.thread.id === threadId) ?? summaries[0];
  const existingIds = new Set(summaries.map((summary) => summary.other.id));
  const newContacts = (contacts.data ?? []).filter(
    (person) => person.id !== user.id && !existingIds.has(person.id),
  );

  return (
    <>
      <PageHeader title="Messages">
        Quick questions between lessons — scheduling, a word you forgot, a link you promised.
      </PageHeader>

      {summaries.length === 0 && newContacts.length === 0 ? (
        <EmptyState icon="💬" title="Nobody to talk to yet">
          {user.role === "student"
            ? "Book a lesson and you can message your tutor here."
            : "Once a student books you, your conversation starts here."}
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <Card className="overflow-hidden p-0">
            {summaries.length > 0 ? (
              <ul className="divide-y divide-ink-900/8">
                {summaries.map((summary) => {
                  const selected = summary.thread.id === active?.thread.id;
                  return (
                    <li key={summary.thread.id}>
                      <button
                        type="button"
                        onClick={() => setThreadId(summary.thread.id)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3.5 text-left transition",
                          selected ? "bg-sand-100" : "hover:bg-sand-50",
                        )}
                      >
                        <Avatar name={summary.other.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-ink-800">
                              {summary.other.name}
                            </span>
                            {summary.unread > 0 ? (
                              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-saffron-400 text-[0.65rem] font-bold text-ink-900">
                                {summary.unread}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-ink-400">
                            {summary.lastMessage?.body ?? "No messages yet"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {newContacts.length > 0 ? (
              <div className="border-t border-ink-900/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Start a conversation
                </p>
                <ul className="mt-2 space-y-1">
                  {newContacts.slice(0, 6).map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        disabled={start.pending}
                        onClick={async () => {
                          const thread = await start.run(person.id);
                          if (thread) setThreadId(thread.id);
                        }}
                        className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-ink-600 transition hover:bg-sand-100 hover:text-ink-900"
                      >
                        {person.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          {active ? (
            <Conversation
              key={active.thread.id}
              threadId={active.thread.id}
              me={user}
              other={active.other}
            />
          ) : (
            <Card className="grid place-items-center p-10 text-sm text-ink-400">
              Pick someone to start.
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function Conversation({
  threadId,
  me,
  other,
}: {
  threadId: string;
  me: User;
  other: User;
}) {
  const messages = useQuery(() => api.messages.forThread(threadId), [threadId]);
  const [draft, setDraft] = useState("");
  const send = useAction(() => api.messages.send(threadId, me.id, draft));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api.messages.markRead(threadId, me.id);
  }, [threadId, me.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  const list = messages.data ?? [];

  return (
    <Card className="flex min-h-[26rem] flex-col p-0">
      <div className="flex items-center gap-3 border-b border-ink-900/8 px-5 py-4">
        <Avatar name={other.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-display text-base text-ink-900">{other.name}</p>
          <p className="text-xs text-ink-400">
            {other.role === "tutor" ? "Tutor" : "Student"} · {other.timezone}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.loading && list.length === 0 ? (
          <Loading label="Loading" />
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">
            Say hello — {other.name.split(" ")[0]} will see it next time they log in.
          </p>
        ) : (
          list.map((message) => {
            const mine = message.senderId === me.id;
            return (
              <div
                key={message.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5",
                    mine
                      ? "bg-ink-900 text-sand-50"
                      : "bg-sand-100 text-ink-800",
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[0.7rem]",
                      mine ? "text-sand-200/60" : "text-ink-400",
                    )}
                    title={relativeTime(message.sentAt)}
                  >
                    {formatTime(message.sentAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-ink-900/8 px-4 py-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          const result = await send.run();
          if (result) setDraft("");
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          aria-label="Message"
        />
        <Button type="submit" disabled={send.pending || draft.trim().length === 0}>
          Send
        </Button>
      </form>
    </Card>
  );
}
