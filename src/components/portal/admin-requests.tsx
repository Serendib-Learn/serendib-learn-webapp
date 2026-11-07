"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { photoUrlFor } from "@/lib/api/public";
import { useAction, useQuery } from "@/lib/hooks";
import { rupeesLkr } from "@/lib/credits";
import { formatDateTime, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Textarea } from "@/components/ui/field";
import { Alert, Avatar, Badge, Card, EmptyState, Loading } from "@/components/ui/primitives";
import type { CreditReason, LessonCredit, MissedCause, PublicProfile, StudentRequest } from "@/lib/types";

const causeLabel: Record<MissedCause, string> = {
  tutor_absent: "Tutor did not come",
  technical: "Technical problems",
  student_unable: "Student could not make it",
  other: "Something else",
};

const statusTone = { pending: "saffron", approved: "jade", declined: "clay" } as const;

const creditReasonLabel: Record<CreditReason, string> = {
  free_session: "Free session request approved",
  missed_session: "Missed lesson made up",
  tutor_cancelled: "Paid lesson cancelled by the tutor or team",
  student_cancelled: "Paid lesson cancelled by the student in good time",
  prepaid: "Prepaid lesson",
};

/** Credits that stand for a lesson the student paid for, so can be refunded (the refund policy). */
const refundable = (credit: LessonCredit) =>
  credit.reason === "tutor_cancelled" || credit.reason === "student_cancelled" || credit.reason === "prepaid";

/** "Rs 5,000 · paid 2026-11-01 · Bank transfer", for a prepaid lesson. */
function prepaidDetail(credit: LessonCredit): string {
  return [credit.amountLkr !== undefined ? rupeesLkr(credit.amountLkr) : null, credit.paidOn ? `paid ${credit.paidOn}` : null, credit.paymentNote]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Administration → Requests: free session requests and missed-lesson
 * reports. Only administrators (the super admin included) can approve, which
 * gives the student a free lesson; declining needs a note, which is emailed.
 */
export function AdminRequests() {
  const requests = useQuery(() => api.requests.list(), []);
  const people = useQuery(() => api.users.directory(), []);

  if (requests.loading) return <Loading label="Loading requests" />;

  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));
  const all = requests.data ?? [];
  const pending = all.filter((item) => item.status === "pending");
  const decided = all.filter((item) => item.status !== "pending").slice(0, 30);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display text-xl text-forest">Waiting for a decision</h2>
        {pending.length === 0 ? (
          <EmptyState icon="✅" title="Nothing waiting">
            Free session requests and missed-lesson reports from students appear here.
          </EmptyState>
        ) : (
          pending.map((item) => <PendingRequest key={item.id} item={item} people={byId} />)
        )}
      </section>

      <HeldCredits people={byId} />

      {decided.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-forest">Recently decided</h2>
          {decided.map((item) => (
            <Card key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm text-ink-800">
                  {item.kind === "free_session" ? "Free session" : "Missed lesson"} ·{" "}
                  {byId.get(item.studentId)?.name ?? "Former student"}
                </p>
                <p className="text-xs text-ink-400">
                  Decided {item.decidedAt ? relativeTime(item.decidedAt) : ""}
                  {item.decidedById ? ` by ${byId.get(item.decidedById)?.name ?? "an administrator"}` : ""}
                  {item.decisionNote ? `: “${item.decisionNote}”` : ""}
                </p>
              </div>
              <Badge tone={statusTone[item.status]}>{item.status === "approved" ? "Approved" : "Declined"}</Badge>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function PendingRequest({ item, people }: { item: StudentRequest; people: Map<string, PublicProfile> }) {
  const student = people.get(item.studentId);
  const [note, setNote] = useState("");
  const approve = useAction(() => api.requests.approve(item.id, note.trim() || undefined));
  const decline = useAction(() => api.requests.decline(item.id, note.trim()));
  const credits = useQuery(() => api.requests.credits(item.studentId), [item.studentId]);
  const booking = useQuery(
    async () =>
      item.bookingId ? (await api.bookings.forUser(item.studentId)).find((b) => b.id === item.bookingId) ?? null : null,
    [item.bookingId, item.studentId],
  );
  const busy = approve.pending || decline.pending;
  const { confirm, dialog } = useConfirm();

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={student?.name ?? "Student"} avatarId={student?.avatarId} photoUrl={photoUrlFor(student)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink-800">{student?.name ?? "Former student"}</p>
            <Badge tone={item.kind === "free_session" ? "ocean" : "saffron"}>
              {item.kind === "free_session" ? "Free session" : "Missed lesson"}
            </Badge>
            {(credits.data?.available ?? 0) > 0 ? (
              <Badge tone="jade">Already has {credits.data?.available} free</Badge>
            ) : null}
          </div>
          <p className="text-xs text-ink-400">Asked {relativeTime(item.createdAt)}</p>
          {item.kind === "missed_session" ? (
            <p className="mt-2 text-sm text-ink-600">
              {booking.data
                ? `Lesson on ${formatDateTime(booking.data.startsAt)} with ${people.get(booking.data.tutorId)?.name ?? "their tutor"}: ${booking.data.focus}.`
                : "The lesson they missed."}{" "}
              {item.cause ? <span className="font-medium">{causeLabel[item.cause]}.</span> : null}
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-700">{item.reason}</p>
        </div>
      </div>

      <Field
        label="Note to the student"
        htmlFor={`note-${item.id}`}
        hint="Optional when approving (it goes in their email); needed when declining."
      >
        <Textarea
          id={`note-${item.id}`}
          className="min-h-20"
          value={note}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {approve.error || decline.error ? <Alert>{approve.error ?? decline.error}</Alert> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="danger-ghost"
          disabled={busy || !note.trim()}
          onClick={async () => {
            const yes = await confirm({
              title: "Decline this request?",
              message: `${student?.name ?? "The student"} is emailed your note and sees the request as not approved. No free lesson is given.`,
              confirmLabel: "Decline request",
            });
            if (yes) void decline.run();
          }}
        >
          Decline
        </Button>
        <Button disabled={busy} onClick={() => void approve.run()}>
          {approve.pending ? "Approving…" : "Approve and give a free lesson"}
        </Button>
      </div>
      {dialog}
    </Card>
  );
}

/**
 * Unused free lessons, and recording a refund of one (the refund policy: an
 * unused paid lesson can be refunded within 30 days). The money goes back in
 * the Payments.lk dashboard; this takes the lesson off the student's account.
 */
function HeldCredits({ people }: { people: Map<string, PublicProfile> }) {
  const credits = useQuery(() => api.requests.heldCredits(), []);
  const refund = useAction((id: string) => api.requests.markCreditRefunded(id));
  const { confirm, dialog } = useConfirm();
  const held = credits.data ?? [];
  if (credits.loading || held.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl text-forest">Free and prepaid lessons held</h2>
        <p className="text-xs text-ink-400">
          Lessons students can still book without paying. One that stands for a paid lesson can be
          refunded within 30 days of the payment: refund a card payment in the Payments.lk dashboard,
          or a prepaid lesson by bank transfer, then mark it refunded here.
        </p>
      </div>
      {refund.error ? <Alert>{refund.error}</Alert> : null}
      {held.map((credit) => {
        const student = people.get(credit.studentId);
        return (
          <Card key={credit.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm text-ink-800">{student?.name ?? "Former student"}</p>
              <p className="text-xs text-ink-400">
                {creditReasonLabel[credit.reason]} · {relativeTime(credit.createdAt)}
                {credit.reason === "prepaid" && prepaidDetail(credit) ? ` · ${prepaidDetail(credit)}` : ""}
              </p>
            </div>
            {refundable(credit) ? (
              <Button
                variant="danger-ghost"
                size="sm"
                disabled={refund.pending}
                onClick={async () => {
                  const yes = await confirm({
                    title: "Mark this lesson refunded?",
                    message: `Do this after refunding the payment ${credit.reason === "prepaid" ? `by bank transfer${credit.amountLkr !== undefined ? ` (${rupeesLkr(credit.amountLkr)} for this lesson)` : ""}` : "in the Payments.lk dashboard"}. The lesson is taken off ${student?.name ?? "the student"}'s account, so it can no longer be booked, and they are emailed that it was refunded.`,
                    confirmLabel: "Mark refunded",
                  });
                  if (yes) void refund.run(credit.id);
                }}
              >
                Mark refunded
              </Button>
            ) : (
              <Badge tone="neutral">Goodwill, not refundable</Badge>
            )}
          </Card>
        );
      })}
      {dialog}
    </section>
  );
}

