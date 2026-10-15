import type { CourseChapter } from "./types.ts";

/**
 * The chapters a fresh site starts with. Administrators can rename, reorder,
 * add and remove chapters afterwards (Learning hub → Manage chapters); these
 * are only written when the chapters collection is empty.
 *
 * Two sources: the original site's learning hub stages ("Foundation", with
 * Say Hello, Who's Who and Calling Grandma; "Building & Fluency"), and the
 * eight Survival Sri Lanka chapters from docs/Serendib-Vocabulary-Cards.docx,
 * which link to their phrase lists so a chapter is never empty.
 */
export const defaultChapters: Omit<CourseChapter, "createdAt">[] = [
  { id: "ch_alphabet", stage: "Foundation", order: 10, title: "The alphabet and its sounds", summary: "Every letter of the script, with the sound it makes. Start with the alphabet sheet." },
  { id: "ch_say-hello", stage: "Foundation", order: 20, title: "Say hello", summary: "Greetings, thank you, sorry — the words you use with everyone." },
  { id: "ch_whos-who", stage: "Foundation", order: 30, title: "Who's who", summary: "Family words: who is akka, who is aiya, and what to call an aunty." },
  { id: "ch_calling-grandma", stage: "Foundation", order: 40, title: "Calling grandma", summary: "A whole phone call, start to finish, the way family actually talks." },
  { id: "ch_arriving", stage: "Survival Sri Lanka", order: 110, title: "Arriving", summary: "Through the airport with grace.", vocabChapterId: "arriving" },
  { id: "ch_finding-your-driver", stage: "Survival Sri Lanka", order: 120, title: "Finding your driver", summary: "Someone at arrivals has a card with your name.", vocabChapterId: "finding-your-driver" },
  { id: "ch_tuk-tuk", stage: "Survival Sri Lanka", order: 130, title: "Tuk tuk adventure", summary: "Agree the fare, then get where you are going.", vocabChapterId: "tuk-tuk-adventure" },
  { id: "ch_at-the-shop", stage: "Survival Sri Lanka", order: 140, title: "At the shop", summary: "Water, snacks and a SIM at the corner kade.", vocabChapterId: "at-the-shop" },
  { id: "ch_ordering-food", stage: "Survival Sri Lanka", order: 150, title: "Ordering food", summary: "Kottu, hoppers, rice and curry — and 'no chilli'.", vocabChapterId: "ordering-food" },
  { id: "ch_bathroom", stage: "Survival Sri Lanka", order: 160, title: "Finding the bathroom", summary: "Small, vital, and polite.", vocabChapterId: "finding-the-bathroom" },
  { id: "ch_weather", stage: "Survival Sri Lanka", order: 170, title: "Weather chat", summary: "The small talk that opens doors.", vocabChapterId: "weather-chat" },
  { id: "ch_relatives", stage: "Survival Sri Lanka", order: 180, title: "Meeting relatives", summary: "Greetings that matter, to the people who matter.", vocabChapterId: "meeting-relatives" },
  { id: "ch_conversation", stage: "Building & fluency", order: 210, title: "Holding a conversation", summary: "Keeping a conversation going: questions, follow-ups, and filling the silences." },
  { id: "ch_your-story", stage: "Building & fluency", order: 220, title: "Telling your own story", summary: "Where you are from, what you do, and why you are learning." },
  { id: "ch_worksheets", stage: "Worksheets & printables", order: 900, title: "Worksheets and printables", summary: "General printables, homework templates and offline practice." },
];
