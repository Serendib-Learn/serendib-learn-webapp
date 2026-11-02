"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Textarea } from "@/components/ui/field";
import { Alert, Badge, Card, EmptyState, Loading } from "@/components/ui/primitives";
import type { HelpQuestion } from "@/lib/types";

/**
 * Administration → Questions: what people asked through the help widget's
 * "Ask us" when the guided topics didn't cover it. A reply is emailed to the
 * address they gave; follow-ups can be sent the same way.
 */
export function AdminQuestions() {
  const questions = useQuery(() => api.help.list(), []);

  if (questions.loading) return <Loading label="Loading questions" />;
  if (questions.error) return <Alert>{questions.error}</Alert>;

  const all = questions.data ?? [];
  const open = all.filter((item) => item.status === "open");
  const answered = all.filter((item) => item.status === "answered").slice(0, 50);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display text-xl text-forest">Waiting for a reply</h2>
        {open.length === 0 ? (
          <EmptyState icon="✅" title="No questions waiting">
            Questions from the Help button that the guide didn&rsquo;t answer appear here.
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

      <p className="text-sm leading-relaxed whitespace-pre-line text-ink-700">{item.question}</p>

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
          hint={`Emailed to ${item.email}, with their question underneath.`}
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
              title: "Delete this question?",
              message: `${item.name}'s question is removed for good. Nothing is sent to them. Use this for spam.`,
              confirmLabel: "Delete question",
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
