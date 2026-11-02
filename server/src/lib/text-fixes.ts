/**
 * Copy fixes for teaching content that lives in the database, applied once by
 * `db/data-fixes.ts` and kept in step with the seed files (which already read
 * this way). Exact sentences first, where a plain comma would read badly;
 * then any em dash left becomes a comma, or nothing where it stood alone.
 */
export const exactTextFixes: Record<string, string> = {
  // The phrase nobody says: "bathroom" in Sri Lanka is "toilet ekak".
  "වැසිකිළියට නවත්තන්න පුළුවන්ද?": "ටොයිලට් එකකට නවත්තන්න පුළුවන්ද?",
  "Wesikiliyata nawaththanna puluvanda?": "Toilet ekakata nawaththanna puluvanda?",
  "Ammachi, Seeya, Aiya, Akka — greetings that matter.": "Ammachi, Seeya, Aiya, Akka: greetings that matter.",
  "Kottu, hoppers, rice and curry — and 'no chilli' when you need it.": "Kottu, hoppers, rice and curry, and 'no chilli' when you need it.",
  "Kottu, hoppers, rice and curry — and 'no chilli'.": "Kottu, hoppers, rice and curry, and 'no chilli'.",
  "Greetings, thank you, sorry — the words you use with everyone.": "Greetings, thank you, sorry: the words you use with everyone.",
  "Including ழ, the sound Tamil is famous for — practise it with your tutor.": "Including ழ, the sound Tamil is famous for. Practise it with your tutor.",
  "the everyday consonants — the aspirated": "the everyday consonants. The aspirated",
  "The Sinhala name says the same thing — Pita Kotuwa": "The Sinhala name says the same thing: Pita Kotuwa",
  "frescoes — women in procession, painted around the rock — and then": "frescoes (women in procession, painted around the rock) and then",
  "Roughly 1,200 steps — go at opening time": "Roughly 1,200 steps. Go at opening time",
  "Hire a bicycle — the site is enormous": "Hire a bicycle: the site is enormous",
  "The Gal Vihara is the reason people come — four figures": "The Gal Vihara is the reason people come: four figures",
  "the right to rule — whoever held": "the right to rule: whoever held",
  "Nine, in stone and brick — no steel": "Nine, in stone and brick, with no steel",
  "has essentially never stopped — the gopurams": "has essentially never stopped. The gopurams",
  "The labour came from South India — Tamil workers": "The labour came from South India: Tamil workers",
  "The all-purpose greeting — palms together": "The all-purpose greeting: palms together",
  "Softens the conversation — most people": "Softens the conversation. Most people",
  "The same word in both languages — a good first one.": "The same word in both languages: a good first one.",
  "Isso wade — deep-fried": "Isso wade: deep-fried",
  "From Tamil pettai — the town": "From Tamil pettai: the town",
  "Vel — the chariot procession": "Vel: the chariot procession",
  "Parakrama Samudra — the Sea of Parakrama": "Parakrama Samudra (the Sea of Parakrama)",
};

/** One string with the fixes applied. */
export function fixText(value: string): string {
  if (exactTextFixes[value] !== undefined) return exactTextFixes[value];
  let text = value;
  for (const [from, to] of Object.entries(exactTextFixes)) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  if (text.trim() === "—") return "";
  return text.replace(/\s*—\s*/g, ", ");
}

/** A document (or any value) with every string in it fixed. Returns the same value when nothing changed. */
export function fixDeep<T>(value: T): T {
  if (typeof value === "string") return fixText(value) as T;
  if (Array.isArray(value)) {
    const next = value.map((item) => fixDeep(item));
    return (next.some((item, index) => item !== value[index]) ? next : value) as T;
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key] = fixDeep(item);
      if (next[key] !== item) changed = true;
    }
    return (changed ? next : value) as T;
  }
  return value;
}
