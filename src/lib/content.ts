/**
 * Small helpers for teaching content. The content itself — phrase lists,
 * alphabet sheets, holidays, stages, heritage sites — is never here: it comes
 * from the database through `api.content` (or `fetchContent` on a public
 * page). These are only the pure functions and labels that work on it.
 */
import type { HeritageRegion, HolidayCategory, LanguageCode, Phrase } from "@/lib/types";

export function scriptOf(phrase: Phrase, language: LanguageCode): string {
  return language === "sinhala" ? phrase.sinhala : phrase.tamil;
}

export function romanOf(phrase: Phrase, language: LanguageCode): string {
  return language === "sinhala" ? phrase.sinhalaRoman : phrase.tamilRoman;
}

/**
 * The file name a letter's (or word's) recorded audio is stored under: its
 * Unicode code points, so it is stable and safe in a URL. Shared with the
 * audio generator (scripts/generate-alphabet-audio.mjs, which has its own
 * copy because it runs outside the app).
 */
export function audioKey(text: string): string {
  return Array.from(text)
    .map((char) => char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"))
    .join("-");
}

export const HOLIDAY_CATEGORY_LABEL: Record<HolidayCategory, string> = {
  poya: "Poya day",
  national: "National",
  hindu: "Hindu",
  muslim: "Muslim",
  christian: "Christian",
};

/** The heritage game's map regions, in the order its filters show them. */
export const HERITAGE_REGIONS: HeritageRegion[] = [
  "Colombo",
  "Cultural Triangle",
  "Hill Country",
  "South Coast",
  "North",
  "East",
];

/** Turns a title into an id for new content, e.g. "Tuk tuk adventure" → "tuk-tuk-adventure". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
