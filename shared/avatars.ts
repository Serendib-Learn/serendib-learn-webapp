/**
 * The characters a member can pick to represent themselves instead of their
 * initials. Each one doubles as a tiny vocabulary lesson: the word for it in
 * both languages, in script and in a pronunciation guide.
 *
 * The ids are stored on `User.avatarId`, and the API only accepts these, so
 * this list lives in `shared/`. The drawings are frontend-only — see
 * `src/components/ui/characters.tsx`.
 */

export interface CharacterWord {
  script: string;
  /** Romanised, as it is usually written. */
  roman: string;
  /** Syllable-by-syllable pronunciation; long vowels marked with a macron. */
  say: string;
}

export interface Character {
  id: string;
  english: string;
  sinhala: CharacterWord;
  tamil: CharacterWord;
  /** One line on why it belongs here. */
  note: string;
}

export const characters: Character[] = [
  {
    id: "akka",
    english: "Elder sister",
    sinhala: { script: "අක්කා", roman: "akka", say: "ak-kā" },
    tamil: { script: "அக்கா", roman: "akka", say: "ak-kā" },
    note: "The same word in both languages — a good first one.",
  },
  {
    id: "aiya",
    english: "Elder brother",
    sinhala: { script: "අයියා", roman: "aiya", say: "ai-yā" },
    tamil: { script: "அண்ணா", roman: "anna", say: "aṇ-ṇā" },
    note: "Also how you politely call out to a shopkeeper or a tuk-tuk driver.",
  },
  {
    id: "aachchi",
    english: "Grandmother",
    sinhala: { script: "ආච්චි", roman: "aachchi", say: "āch-chi" },
    tamil: { script: "ஆச்சி", roman: "aachchi", say: "āch-chi" },
    note: "The person most of our students are learning to talk to.",
  },
  {
    id: "seeya",
    english: "Grandfather",
    sinhala: { script: "සීයා", roman: "seeya", say: "sī-yā" },
    tamil: { script: "தாத்தா", roman: "thaththa", say: "tāt-tā" },
    note: "Usually found with a newspaper and an opinion about it.",
  },
  {
    id: "yaka",
    english: "Raksha mask",
    sinhala: { script: "යකා", roman: "yaka", say: "ya-kā" },
    tamil: { script: "அரக்கன்", roman: "arakkan", say: "a-rak-kan" },
    note: "The fierce masks of the southern coast, carved to scare away bad luck.",
  },
  {
    id: "kotiya",
    english: "Leopard",
    sinhala: { script: "කොටියා", roman: "kotiya", say: "ko-ṭi-yā" },
    tamil: { script: "சிறுத்தை", roman: "siruththai", say: "si-ṟut-tai" },
    note: "Yala has one of the highest leopard densities in the world.",
  },
  {
    id: "aliya",
    english: "Elephant",
    sinhala: { script: "අලියා", roman: "aliya", say: "a-li-yā" },
    tamil: { script: "யானை", roman: "yaanai", say: "yā-nai" },
    note: "Dressed for the Kandy Esala Perahera.",
  },
  {
    id: "monara",
    english: "Peacock",
    sinhala: { script: "මොනරා", roman: "monara", say: "mo-na-rā" },
    tamil: { script: "மயில்", roman: "mayil", say: "ma-yil" },
    note: "Sacred to Murugan, and loud enough to wake a whole village.",
  },
  {
    id: "ibba",
    english: "Turtle",
    sinhala: { script: "ඉබ්බා", roman: "ibba", say: "ib-bā" },
    tamil: { script: "ஆமை", roman: "aamai", say: "ā-mai" },
    note: "Five of the world's seven sea turtles nest on Sri Lankan beaches.",
  },
];

export const characterIds = characters.map((character) => character.id);

export function getCharacter(id: string | undefined): Character | undefined {
  return id ? characters.find((character) => character.id === id) : undefined;
}
