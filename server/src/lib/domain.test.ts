import assert from "node:assert/strict";
import { test } from "node:test";
import { blocksSlot, lessonPriceLkr, minutesFromMidnight, overlaps } from "./domain.ts";
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

test("lessonPriceLkr: LKR 5,000 an hour for every tutor, by length", () => {
  assert.equal(lessonPriceLkr(60), 5000);
  assert.equal(lessonPriceLkr(90), 7500);
  assert.equal(lessonPriceLkr(30), 2500);
});

test("blocksSlot: only awaiting_payment and confirmed occupy a slot", () => {
  const base = { id: "b", tutorId: "t", studentId: "s", startsAt: "", durationMins: 60,
    language: "sinhala", focus: "", priceLkr: 0, createdAt: "" } as const;

  assert.equal(blocksSlot({ ...base, status: "awaiting_payment" } as Booking), true);
  assert.equal(blocksSlot({ ...base, status: "confirmed" } as Booking), true);
  assert.equal(blocksSlot({ ...base, status: "completed" } as Booking), false);
  assert.equal(blocksSlot({ ...base, status: "cancelled" } as Booking), false);
});
