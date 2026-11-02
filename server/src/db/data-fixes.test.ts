import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startTestServer } from "../test-support/harness.ts";
import { fixText } from "../lib/text-fixes.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

test("fixText: no em dashes, and the bathroom phrase people actually say", () => {
  assert.equal(fixText("Wesikiliyata nawaththanna puluvanda?"), "Toilet ekakata nawaththanna puluvanda?");
  assert.equal(fixText("වැසිකිළියට නවත්තන්න පුළුවන්ද?"), "ටොයිලට් එකකට නවත්තන්න පුළුවන්ද?");
  assert.equal(fixText("Hire a bicycle — the site is enormous"), "Hire a bicycle: the site is enormous");
  assert.equal(fixText("k as in “skip” — no puff of air"), "k as in “skip”, no puff of air");
  assert.equal(fixText("—"), "", "a lone dash standing for 'none' becomes empty");
  assert.equal(fixText("an r–l sound"), "an r–l sound", "en dashes are left alone");
});

test("data fixes: rewrite old teaching content once, and only once", async () => {
  const { db } = await import("./database.ts");
  const { applyDataFixes } = await import("./data-fixes.ts");

  // As production has it: written before the fix.
  await db().phraseLists.insertOne({
    id: "old-arrivals",
    number: 99,
    emoji: "🚕",
    title: "Old arrivals",
    scene: "Someone is waiting — with a card.",
    stage: "Survival Sri Lanka",
    phrases: [
      {
        n: 1,
        english: "Can we stop for a bathroom?",
        sinhala: "වැසිකිළියට නවත්තන්න පුළුවන්ද?",
        sinhalaRoman: "Wesikiliyata nawaththanna puluvanda?",
        tamil: "கழிவறைக்கு நிறுத்த முடியுமா?",
        tamilRoman: "Kazhivaraiku niruththa mudiyumaa?",
        note: "Ask nicely — they will stop.",
      },
    ],
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
  const clean = await db().phraseLists.find({ id: { $ne: "old-arrivals" } });

  await db().dataFixes.deleteOne({ id: "2026-11-content-copy" });
  await applyDataFixes(db());

  const fixed = await db().phraseLists.findById("old-arrivals");
  assert.equal(fixed?.scene, "Someone is waiting, with a card.");
  assert.equal(fixed?.phrases[0].sinhala, "ටොයිලට් එකකට නවත්තන්න පුළුවන්ද?");
  assert.equal(fixed?.phrases[0].sinhalaRoman, "Toilet ekakata nawaththanna puluvanda?");
  assert.equal(fixed?.phrases[0].note, "Ask nicely, they will stop.");
  assert.equal(fixed?.emoji, "🚕");
  assert.deepEqual(await db().phraseLists.find({ id: { $ne: "old-arrivals" } }), clean, "already-clean content is untouched");
  assert.ok(await db().dataFixes.findById("2026-11-content-copy"));

  // Recorded, so it does not run again: an edit made afterwards stays.
  await db().phraseLists.updateOne({ id: "old-arrivals" }, { scene: "Edited later — on purpose." });
  await applyDataFixes(db());
  assert.equal((await db().phraseLists.findById("old-arrivals"))?.scene, "Edited later — on purpose.");
});
