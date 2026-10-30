"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAction, useQuery, useTimezone } from "@/lib/hooks";
import { formatClock, weekdayNames } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Card, Loading } from "@/components/ui/primitives";

/**
 * A tutor's weekly hours. They are wall-clock times in the tutor's profile
 * timezone — the API turns them into real times from that, never from the
 * server's clock — and students see them converted to their own.
 */
export function AvailabilityEditor({ tutorId, timezone }: { tutorId: string; timezone: string }) {
  const browserTimezone = useTimezone();
  const rules = useQuery(() => api.availability.forTutor(tutorId), [tutorId]);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");

  const add = useAction(() =>
    api.availability.add({ tutorId, weekday, start, end }),
  );
  const remove = useAction((id: string) => api.availability.remove(id));
  const { confirm, dialog } = useConfirm();

  return (
    <Card className="p-6">
      {dialog}
      <h2 className="text-xl">Weekly availability</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
        Students can only book inside these blocks, split into one-hour slots. Times are{" "}
        <span className="font-medium text-ink-700">{timezone || "Asia/Colombo"}</span> time (your
        profile&apos;s timezone); students see them converted to their own.
      </p>
      {browserTimezone && timezone && browserTimezone !== timezone ? (
        <Alert tone="saffron" className="mt-3">
          This device is set to {browserTimezone}, but your profile says {timezone}. The hours
          below are {timezone} time. If that is wrong, change the timezone under Profile.
        </Alert>
      ) : null}

      {rules.loading ? (
        <Loading label="Loading your hours" />
      ) : (rules.data ?? []).length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-ink-900/15 px-4 py-6 text-center text-sm text-ink-500">
          Nothing published yet, so nobody can book you.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-ink-900/8">
          {(rules.data ?? []).map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-800">{weekdayNames[rule.weekday]}</p>
                <p className="text-xs text-ink-400">
                  {formatClock(rule.start)} – {formatClock(rule.end)}
                </p>
              </div>
              <Button
                variant="danger-ghost"
                size="sm"
                disabled={remove.pending}
                onClick={async () => {
                  const yes = await confirm({
                    title: `Remove your ${weekdayNames[rule.weekday]} hours?`,
                    message: `Students can no longer book ${formatClock(rule.start)}–${formatClock(rule.end)} on ${weekdayNames[rule.weekday]}s. Lessons already booked are not affected.`,
                    confirmLabel: "Remove hours",
                  });
                  if (yes) void remove.run(rule.id);
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-ink-900/8 pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Day" htmlFor="availability-day">
            <Select
              id="availability-day"
              value={weekday}
              onChange={(event) => setWeekday(Number(event.target.value))}
            >
              {weekdayNames.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="From" htmlFor="availability-start">
            <Input
              id="availability-start"
              type="time"
              value={start}
              step={900}
              onChange={(event) => setStart(event.target.value)}
            />
          </Field>

          <Field label="Until" htmlFor="availability-end">
            <Input
              id="availability-end"
              type="time"
              value={end}
              step={900}
              onChange={(event) => setEnd(event.target.value)}
            />
          </Field>
        </div>

        {add.error ? (
          <div className="mt-4">
            <Alert>{add.error}</Alert>
          </div>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={add.pending}
          onClick={() => void add.run()}
        >
          {add.pending ? "Adding…" : "Add block"}
        </Button>
      </div>
    </Card>
  );
}
