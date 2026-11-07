import type { LessonCredit } from "./types";

/** Lessons a student can still book with (free or prepaid), oldest first: the order they are spent in. */
export function unusedCredits(credits: LessonCredit[]): LessonCredit[] {
  return credits
    .filter((credit) => !credit.usedBookingId && !credit.refundedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** What to call the lessons a student holds: "prepaid lesson", "free lesson", or both. */
export function creditNoun(unused: LessonCredit[]): string {
  const prepaid = unused.filter((credit) => credit.reason === "prepaid").length;
  if (prepaid === 0) return "free lesson";
  if (prepaid === unused.length) return "prepaid lesson";
  return "free or prepaid lesson";
}

/** "Rs 20,000". */
export const rupeesLkr = (amount: number) => `Rs ${amount.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
