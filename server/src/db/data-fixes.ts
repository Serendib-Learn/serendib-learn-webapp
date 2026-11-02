import { fixDeep } from "../lib/text-fixes.ts";
import { nowIso } from "../lib/ids.ts";
import { isDuplicateId, type Collection, type Doc } from "./store.ts";
import type { Database } from "./database.ts";

/**
 * One-off changes to data already in the database, run when the API starts.
 * Each has an id, recorded in `dataFixes` once it has run, so it never runs
 * again; two instances starting together may both apply one, which is
 * harmless because every fix gives the same result twice.
 */
export async function applyDataFixes(target: Database): Promise<void> {
  for (const fix of fixes) {
    if (await target.dataFixes.findById(fix.id)) continue;
    const changed = await fix.run(target);
    try {
      await target.dataFixes.insertOne({ id: fix.id, appliedAt: nowIso() });
    } catch (error) {
      if (!isDuplicateId(error)) throw error;
    }
    console.log(`Data fix ${fix.id}: ${changed} document(s) changed.`);
  }
}

/** Rewrites every document whose strings `fixDeep` changes. */
async function fixStrings<T extends Doc>(collection: Collection<T>): Promise<number> {
  let changed = 0;
  for (const doc of await collection.find({})) {
    const fixed = fixDeep(doc);
    if (fixed === doc) continue;
    const changes: Partial<T> = {};
    for (const key of Object.keys(fixed) as (keyof T)[]) {
      if (key !== "id" && fixed[key] !== doc[key]) changes[key] = fixed[key];
    }
    await collection.updateOne({ id: doc.id } as never, changes);
    changed += 1;
  }
  return changed;
}

const fixes: { id: string; run: (target: Database) => Promise<number> }[] = [
  {
    // The owners' review, November 2026: no em dashes in the teaching
    // content, and "Wesikiliyata" becomes "Toilet ekakata" (lib/text-fixes.ts).
    id: "2026-11-content-copy",
    run: async (target) =>
      (await fixStrings(target.phraseLists)) +
      (await fixStrings(target.alphabetSheets)) +
      (await fixStrings(target.holidays)) +
      (await fixStrings(target.courseStages)) +
      (await fixStrings(target.heritageSites)) +
      (await fixStrings(target.chapters)),
  },
];
