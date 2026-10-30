import assert from "node:assert/strict";
import { test } from "node:test";
import { formatInZone, validTimezone, wallClock, weekdayOf, zonedInstant } from "./time.ts";

/** These hold whatever timezone the server runs in (Cloud Run is UTC; laptops are not). */

test("zonedInstant: a wall-clock time in a named zone, as a real instant", () => {
  assert.equal(zonedInstant(2026, 11, 2, 18 * 60, "Asia/Colombo").toISOString(), "2026-11-02T12:30:00.000Z");
  assert.equal(zonedInstant(2026, 1, 15, 9 * 60, "America/Toronto").toISOString(), "2026-01-15T14:00:00.000Z");
  // Summer time in London: 18:00 BST is 17:00 UTC.
  assert.equal(zonedInstant(2026, 7, 1, 18 * 60, "Europe/London").toISOString(), "2026-07-01T17:00:00.000Z");
  // Days roll over into the next month.
  assert.equal(zonedInstant(2026, 10, 32, 0, "Asia/Colombo").toISOString(), "2026-10-31T18:30:00.000Z");
});

test("wallClock and weekdayOf: the date where the tutor is, not where the server is", () => {
  // 20:00 UTC on Monday is already 01:30 on Tuesday in Colombo.
  const clock = wallClock(new Date("2026-11-02T20:00:00Z"), "Asia/Colombo");
  assert.deepEqual(clock, { year: 2026, month: 11, day: 3, hour: 1, minute: 30 });
  assert.equal(weekdayOf(2026, 11, 2), 1, "2 November 2026 is a Monday");
});

test("formatInZone: email times in the reader's zone, labelled", () => {
  assert.equal(formatInZone("2026-11-02T12:30:00.000Z", "Asia/Colombo"), "Monday, 2 November 2026, 18:00 (GMT+5:30)");
  assert.equal(formatInZone("2026-11-02T12:30:00.000Z", "Europe/London"), "Monday, 2 November 2026, 12:30 (GMT)");
  assert.match(formatInZone("2026-11-02T12:30:00.000Z", undefined), /18:00 \(GMT\+5:30\)/, "no zone: Sri Lanka time");
});

test("validTimezone: unknown zones fall back to Sri Lanka", () => {
  assert.equal(validTimezone("Europe/London"), "Europe/London");
  assert.equal(validTimezone("Mars/Olympus"), "Asia/Colombo");
  assert.equal(validTimezone(""), "Asia/Colombo");
});
