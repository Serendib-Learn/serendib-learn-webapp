import type { LanguageCode } from "@/lib/types";

/**
 * The language a visitor is here for — Sinhala, Tamil, or both — like the
 * original site's Sinhala/Tamil switch. It tailors the public pages (which
 * tutors are shown, the alphabet sheet's default tab, which greeting comes
 * first). Kept in a cookie so server-rendered pages can read it too.
 */
export type LearningLanguage = LanguageCode | "both";

export const LEARNING_COOKIE = "sl_learning";

export function parseLearningLanguage(value: string | undefined | null): LearningLanguage {
  return value === "sinhala" || value === "tamil" ? value : "both";
}

/** The languages a choice covers, for filtering. */
export function languagesFor(choice: LearningLanguage): LanguageCode[] {
  return choice === "both" ? ["sinhala", "tamil"] : [choice];
}
