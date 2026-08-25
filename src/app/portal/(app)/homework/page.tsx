"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { formatDate, isPast, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  Loading,
  Progress,
  type Tone,
} from "@/components/ui/primitives";
import type { HomeworkItem, HomeworkStatus, User } from "@/lib/types";

const statusTone: Record<HomeworkStatus, Tone> = {
  assigned: "saffron",
  submitted: "ocean",
  reviewed: "jade",
};

const statusLabel: Record<HomeworkStatus, string> = {
  assigned: "To do",
  submitted: "Waiting on tutor",
  reviewed: "Marked",
};

export default function HomeworkPage() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  return user.role === "student" ? (
    <StudentHomework student={user} />
  ) : (
    <TutorHomework tutor={user} />
  );
}

function StudentHomework({ student }: { student: User }) {
  const items = useQuery(() => api.homework.forStudent(student.id), [student.id]);
  const [submitting, setSubmitting] = useState<HomeworkItem | null>(null);

  if (items.loading) return <Loading label="Loading your tasks" />;

  const all = items.data ?? [];
  const open = all.filter((item) => item.status !== "reviewed");
  const done = all.filter((item) => item.status === "reviewed");
  const scored = done.filter((item) => typeof item.score === "number");
  const average =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, item) => sum + (item.score ?? 0), 0) / scored.length,
        )
      : undefined;

  return (
    <>
      <PageHeader title="Homework">
        {open.length === 0
          ? "Nothing outstanding. Enjoy it."
          : `${open.length} ${open.length === 1 ? "task" : "tasks"} on your plate.`}
      </PageHeader>

      {average !== undefined ? (
        <Card className="mb-6 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink-700">Average score</span>
            <span className="font-display text-xl text-ink-900">{average}%</span>
          </div>
          <Progress value={average} className="mt-3" />
          <p className="mt-2 text-xs text-ink-400">
            Across {scored.length} marked {scored.length === 1 ? "task" : "tasks"}.
          </p>
        </Card>
      ) : null}

      {all.length === 0 ? (
        <EmptyState icon="📝" title="No homework yet">
          Your tutor sets tasks after each lesson. They appear here with the due date.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {[...open, ...done].map((item) => {
            const overdue = item.status === "assigned" && isPast(item.dueAt);
            return (
              <Card key={item.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                  {overdue ? <Badge tone="clay">Overdue</Badge> : null}
                  <span className="text-xs text-ink-400">
                    Due {formatDate(item.dueAt)} · {relativeTime(item.dueAt)}
                  </span>
                </div>

                <p className="mt-2.5 font-display text-lg leading-snug text-ink-900">
                  {item.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.brief}</p>

                {item.submissionNote ? (
                  <div className="mt-4 rounded-xl bg-sand-100 px-4 py-3">
                    <p className="text-xs font-semibold text-ink-500">What you sent</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">
                      {item.submissionNote}
                    </p>
                  </div>
                ) : null}

                {item.feedback ? (
                  <div className="mt-3 rounded-xl bg-jade-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-jade-700">Tutor feedback</p>
                      {typeof item.score === "number" ? (
                        <span className="text-sm font-medium text-jade-700">
                          {item.score}/100
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.feedback}</p>
                  </div>
                ) : null}

                {item.status === "assigned" ? (
                  <Button size="sm" className="mt-4" onClick={() => setSubmitting(item)}>
                    Submit work
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {submitting ? (
        <SubmitDialog item={submitting} onClose={() => setSubmitting(null)} />
      ) : null}
    </>
  );
}

function SubmitDialog({ item, onClose }: { item: HomeworkItem; onClose: () => void }) {
  const [note, setNote] = useState("");
  const submit = useAction(() => api.homework.submit(item.id, note.trim()));

  return (
    <Modal open onClose={onClose} title="Submit work" description={item.title}>
      <Field
        label="Notes for your tutor"
        htmlFor="submission-note"
        hint="Where you got stuck, what you tried, questions you want covered next lesson."
      >
        <Textarea
          id="submission-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="I recorded the ten phrases but the retroflex sounds still feel wrong…"
        />
      </Field>

      {submit.error ? (
        <div className="mt-4">
          <Alert>{submit.error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={submit.pending || note.trim().length === 0}
          onClick={async () => {
            const result = await submit.run();
            if (result) onClose();
          }}
        >
          {submit.pending ? "Sending…" : "Send to tutor"}
        </Button>
      </div>
    </Modal>
  );
}

function TutorHomework({ tutor }: { tutor: User }) {
  const items = useQuery(() => api.homework.forTutor(tutor.id), [tutor.id]);
  const tutees = useQuery(() => api.users.tuteesOf(tutor.id), [tutor.id]);
  const [assigning, setAssigning] = useState(false);
  const [reviewing, setReviewing] = useState<HomeworkItem | null>(null);

  if (items.loading) return <Loading label="Loading homework" />;

  const students = (tutees.data ?? []).filter((person) => person.role === "student");
  const byId = new Map(students.map((student) => [student.id, student]));
  const all = items.data ?? [];
  const queue = all.filter((item) => item.status === "submitted");
  const rest = all.filter((item) => item.status !== "submitted");

  return (
    <>
      <PageHeader
        title="Homework"
        action={
          <Button size="sm" disabled={students.length === 0} onClick={() => setAssigning(true)}>
            Set a task
          </Button>
        }
      >
        {queue.length > 0
          ? `${queue.length} ${queue.length === 1 ? "submission" : "submissions"} waiting to be marked.`
          : "Nothing waiting to be marked."}
      </PageHeader>

      {all.length === 0 ? (
        <EmptyState
          icon="✍️"
          title="No tasks set"
          action={
            students.length > 0 ? (
              <Button onClick={() => setAssigning(true)}>Set your first task</Button>
            ) : undefined
          }
        >
          {students.length === 0
            ? "Once a student books a lesson with you, you can set them work."
            : "A short task between lessons keeps momentum going."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {[...queue, ...rest].map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                <span className="text-xs text-ink-400">
                  {byId.get(item.studentId)?.name ?? "Former student"} · due{" "}
                  {formatDate(item.dueAt)}
                </span>
              </div>

              <p className="mt-2.5 font-display text-lg leading-snug text-ink-900">
                {item.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.brief}</p>

              {item.submissionNote ? (
                <div className="mt-4 rounded-xl bg-sand-100 px-4 py-3">
                  <p className="text-xs font-semibold text-ink-500">Student notes</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">
                    {item.submissionNote}
                  </p>
                </div>
              ) : null}

              {item.feedback ? (
                <div className="mt-3 rounded-xl bg-jade-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-jade-700">Your feedback</p>
                    {typeof item.score === "number" ? (
                      <span className="text-sm font-medium text-jade-700">{item.score}/100</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.feedback}</p>
                </div>
              ) : null}

              {item.status === "submitted" ? (
                <Button size="sm" className="mt-4" onClick={() => setReviewing(item)}>
                  Mark it
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {assigning ? (
        <AssignHomework
          tutor={tutor}
          students={students}
          onClose={() => setAssigning(false)}
        />
      ) : null}

      {reviewing ? (
        <ReviewDialog item={reviewing} onClose={() => setReviewing(null)} />
      ) : null}
    </>
  );
}

function defaultDue(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(18, 0, 0, 0);
  // datetime-local wants a local ISO string without the timezone suffix.
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function AssignHomework({
  tutor,
  students,
  onClose,
}: {
  tutor: User;
  students: User[];
  onClose: () => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [dueAt, setDueAt] = useState(defaultDue());

  const create = useAction(() =>
    api.homework.create({
      studentId,
      tutorId: tutor.id,
      title,
      brief,
      dueAt: new Date(dueAt).toISOString(),
    }),
  );

  return (
    <Modal open onClose={onClose} title="Set a task">
      <div className="space-y-4">
        <Field label="Student" htmlFor="homework-student">
          <Select
            id="homework-student"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title" htmlFor="homework-title">
          <Input
            id="homework-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Record the market haggling dialogue"
          />
        </Field>

        <Field label="Brief" htmlFor="homework-brief">
          <Textarea
            id="homework-brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="Use the ten phrases from chapter 4. Send a voice note or write out what you would say."
          />
        </Field>

        <Field label="Due" htmlFor="homework-due">
          <Input
            id="homework-due"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </Field>

        {create.error ? <Alert>{create.error}</Alert> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={create.pending || !title.trim() || !studentId}
            onClick={async () => {
              const result = await create.run();
              if (result) onClose();
            }}
          >
            {create.pending ? "Setting…" : "Set task"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewDialog({ item, onClose }: { item: HomeworkItem; onClose: () => void }) {
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(80);
  const review = useAction(() => api.homework.review(item.id, feedback.trim(), score));

  return (
    <Modal open onClose={onClose} title="Mark homework" description={item.title}>
      <div className="space-y-4">
        {item.submissionNote ? (
          <div className="rounded-xl bg-sand-100 px-4 py-3">
            <p className="text-xs font-semibold text-ink-500">Student notes</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.submissionNote}</p>
          </div>
        ) : null}

        <Field label="Feedback" htmlFor="review-feedback">
          <Textarea
            id="review-feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Your word order is solid now. Next week we work on the long vowels."
          />
        </Field>

        <Field label={`Score — ${score}/100`} htmlFor="review-score">
          <input
            id="review-score"
            type="range"
            min={0}
            max={100}
            step={5}
            value={score}
            onChange={(event) => setScore(Number(event.target.value))}
            className="w-full accent-jade-500"
          />
        </Field>

        {review.error ? <Alert>{review.error}</Alert> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={review.pending || feedback.trim().length === 0}
            onClick={async () => {
              const result = await review.run();
              if (result) onClose();
            }}
          >
            {review.pending ? "Sending…" : "Send feedback"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
