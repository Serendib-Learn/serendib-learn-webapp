"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Textarea } from "@/components/ui/field";
import { Alert, Badge, Card, EmptyState, Loading } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { HelpKind, HelpQuestion } from "@/lib/types";

const kindLabel: Record<HelpKind, string> = {
  question: "Question",
  feedback: "Feedback",
  intro_call: "Intro call",
};

const kindTone = { question: "neutral", feedback: "ocean", intro_call: "saffron" } as const;

const kindOf = (item: HelpQuestion): HelpKind => item.kind ?? "question";

/** A WhatsApp chat link for a number typed any old way ("+44 7700 900123"). */
function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
}

/**
 * Administration → Inbox: questions from the help widget's "Ask us",
 * feedback from the calendar's "Questions or concerns?", and free intro call
 * requests from the pricing page. A reply is emailed to the address they
 * gave; follow-ups can be sent the same way.
 */
export function AdminQuestions() {
  const questions = useQuery(() => api.help.list(), []);
  const [kind, setKind] = useState<HelpKind | "all">("all");

  if (questions.loading) return <Loading label="Loading the inbox" />;
  if (questions.error) return <Alert>{questions.error}</Alert>;

  const everything = questions.data ?? [];
  const all = kind === "all" ? everything : everything.filter((item) => kindOf(item) === kind);
  const open = all.filter((item) => item.status === "open");
  const answered = all.filter((item) => item.status === "answered").slice(0, 50);
  const chips: { id: HelpKind | "all"; label: string }[] = [
    { id: "all", label: "Everything" },
    { id: "intro_call", label: "Intro calls" },
    { id: "feedback", label: "Feedback" },
    { id: "question", label: "Questions" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const waiting = everything.filter(
            (item) => item.status === "open" && (chip.id === "all" || kindOf(item) === chip.id),
          ).length;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={kind === chip.id}
              onClick={() => setKind(chip.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 ring-inset transition",
                kind === chip.id
                  ? "bg-forest text-cream ring-forest"
                  : "bg-white text-ink-600 ring-ink-900/10 hover:text-ink-900",
              )}
            >
              {chip.label}
              {waiting > 0 ? <span className="ml-1 opacity-70">{waiting}</span> : null}
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-forest">Waiting for a reply</h2>
        {open.length === 0 ? (
          <EmptyState icon="✅" title="Nothing waiting">
            Questions from the Help button, feedback from the calendar and intro call requests appear here.
          </EmptyState>
        ) : (
          open.map((item) => <QuestionCard key={item.id} item={item} />)
        )}
      </section>

      {answered.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-forest">Answered</h2>
          {answered.map((item) => (
            <QuestionCard key={item.id} item={item} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function QuestionCard({ item }: { item: HelpQuestion }) {
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(item.status === "open");
  const send = useAction(async () => {
    const updated = await api.help.reply(item.id, reply.trim());
    setReply("");
    setReplying(false);
    return updated;
  });
  const close = useAction(() => api.help.close(item.id));
  const remove = useAction(() => api.help.remove(item.id));
  const { confirm, dialog } = useConfirm();
  const busy = send.pending || close.pending || remove.pending;
  const error = send.error ?? close.error ?? remove.error;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink-800">{item.name}</p>
            <Badge tone={kindTone[kindOf(item)]}>{kindLabel[kindOf(item)]}</Badge>
            {item.userId ? <Badge tone="jade">Has an account</Badge> : <Badge>Visitor</Badge>}
            {item.status === "answered" ? <Badge tone="ocean">Answered</Badge> : null}
          </div>
          <a href={`mailto:${item.email}`} className="text-xs text-jade-700 hover:text-jade-600">
            {item.email}
          </a>
        </div>
        <p className="text-xs text-ink-400">
          {relativeTime(item.createdAt)}
          {item.page ? ` · on ${item.page === "/" ? "the home page" : item.page}` : ""}
        </p>
      </div>

      {item.phone || item.goodTimes ? (
        <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          {item.phone ? (
            <>
              <dt className="text-ink-400">WhatsApp</dt>
              <dd>
                <a href={whatsappLink(item.phone)} target="_blank" rel="noreferrer" className="text-jade-700 hover:text-jade-600">
                  {item.phone}
                </a>
              </dd>
            </>
          ) : null}
          {item.goodTimes ? (
            <>
              <dt className="text-ink-400">Good times</dt>
              <dd className="text-ink-700">{item.goodTimes}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {item.question ? (
        <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">{item.question}</p>
      ) : null}

      {item.replies.length > 0 ? (
        <div className="space-y-2">
          {item.replies.map((sent, index) => (
            <div key={index} className="rounded-lg bg-sand-100/70 px-3 py-2">
              <p className="text-xs text-ink-400">
                {sent.byName} replied {relativeTime(sent.sentAt)}
              </p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-700">{sent.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {replying ? (
        <Field
          label={item.replies.length > 0 ? "Follow-up" : "Your reply"}
          htmlFor={`reply-${item.id}`}
          hint={`Emailed to ${item.email}, with their message underneath.`}
        >
          <Textarea
            id={`reply-${item.id}`}
            className="min-h-24"
            maxLength={5000}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
        </Field>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="danger-ghost"
          size="sm"
          disabled={busy}
          onClick={async () => {
            const yes = await confirm({
              title: "Delete this message?",
              message: `${item.name}'s message is removed for good. Nothing is sent to them. Use this for spam.`,
              confirmLabel: "Delete message",
            });
            if (yes) void remove.run();
          }}
        >
          Delete
        </Button>
        {item.status === "open" ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void close.run()}>
            Mark answered, no email
          </Button>
        ) : null}
        {replying ? (
          <Button size="sm" disabled={busy || !reply.trim()} onClick={() => void send.run()}>
            {send.pending ? "Sending…" : "Send reply"}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setReplying(true)}>
            Send a follow-up
          </Button>
        )}
      </div>
      {dialog}
    </Card>
  );
}
