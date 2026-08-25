import assert from "node:assert/strict";
import { test } from "node:test";
import { blocksSlot, minutesFromMidnight, overlaps, priceFor } from "./domain.ts";
import type { Booking } from "../../../shared/types.ts";

test("overlaps: detects genuine overlap, touching edges are not overlap", () => {
  assert.equal(overlaps(0, 60, 30, 90), true, "partial overlap");
  assert.equal(overlaps(0, 60, 60, 120), false, "back-to-back, shares only the boundary instant");
  assert.equal(overlaps(0, 60, 10, 50), true, "fully contained");
  assert.equal(overlaps(30, 90, 0, 60), true, "symmetric");
});

test("minutesFromMidnight: parses HH:mm", () => {
  assert.equal(minutesFromMidnight("00:00"), 0);
  assert.equal(minutesFromMidnight("09:30"), 570);
  assert.equal(minutesFromMidnight("23:45"), 1425);
});

test("priceFor: rounds rate*duration/60, defaults to $25/hr", () => {
  assert.equal(priceFor({ hourlyRateUsd: 30 } as never, 60), 30);
  assert.equal(priceFor({ hourlyRateUsd: 30 } as never, 90), 45);
  assert.equal(priceFor({ hourlyRateUsd: 28 } as never, 30), 14);
  assert.equal(priceFor({} as never, 60), 25, "no rate set on the tutor falls back to $25/hr");
});

test("blocksSlot: only awaiting_payment and confirmed occupy a slot", () => {
  const base = { id: "b", tutorId: "t", studentId: "s", startsAt: "", durationMins: 60,
    language: "sinhala", focus: "", priceUsd: 0, createdAt: "" } as const;

  assert.equal(blocksSlot({ ...base, status: "awaiting_payment" } as Booking), true);
  assert.equal(blocksSlot({ ...base, status: "confirmed" } as Booking), true);
  assert.equal(blocksSlot({ ...base, status: "completed" } as Booking), false);
  assert.equal(blocksSlot({ ...base, status: "cancelled" } as Booking), false);
});
