/**
 * The Sinhala and Tamil alphabet sheets: every letter with its romanisation,
 * a plain-English sound hint, its IPA, and an example word.
 *
 * A first pass drafted with AI for the tutors to review — the page says so.
 * Sound hints compare to (British) English where a close match exists and
 * describe the mouth position where none does. Example words are everyday
 * ones where possible; the rarer letters have none rather than a forced one.
 */

export interface Letter {
  letter: string;
  roman: string;
  /** Plain-English guide to the sound. */
  sound: string;
  ipa: string;
  example?: { word: string; roman: string; meaning: string };
}

export interface LetterGroup {
  title: string;
  /** The group's name in the script itself, and romanised. */
  native?: string;
  intro: string;
  letters: Letter[];
}

export interface VowelSign {
  /** The consonant with the sign attached. */
  form: string;
  roman: string;
}

export interface AlphabetSheet {
  language: "sinhala" | "tamil";
  name: string;
  native: string;
  intro: string;
  groups: LetterGroup[];
  /** How each vowel looks once it is attached to a consonant. */
  vowelSigns: { base: string; intro: string; signs: VowelSign[] };
  /** BCP 47 tags to look for a speech-synthesis voice with. */
  voiceLangs: string[];
}

export const sinhalaAlphabet: AlphabetSheet = {
  language: "sinhala",
  name: "Sinhala",
  native: "සිංහල හෝඩිය",
  intro:
    "Sinhala is written left to right in a rounded script descended from Brahmi. Each consonant carries a short 'a' until a vowel sign or the hal kirīma (්) changes it. Start with the vowels and the everyday consonants — the aspirated letters near the end mostly appear in formal and borrowed words.",
  voiceLangs: ["si-LK", "si"],
  groups: [
    {
      title: "Vowels",
      native: "ස්වර · svara",
      intro: "Short and long pairs: the long one is the same sound, held for longer. Length changes meaning.",
      letters: [
        { letter: "අ", roman: "a", sound: "like the u in “cup”", ipa: "a", example: { word: "අම්මා", roman: "ammā", meaning: "mother" } },
        { letter: "ආ", roman: "ā", sound: "like the a in “father”", ipa: "aː", example: { word: "ආච්චි", roman: "āchchi", meaning: "grandmother" } },
        { letter: "ඇ", roman: "æ", sound: "like the a in “cat”", ipa: "æ", example: { word: "ඇස", roman: "æsa", meaning: "eye" } },
        { letter: "ඈ", roman: "ǣ", sound: "the a in “cat”, held longer", ipa: "æː", example: { word: "ඈත", roman: "ǣta", meaning: "far" } },
        { letter: "ඉ", roman: "i", sound: "like the i in “sit”", ipa: "i", example: { word: "ඉර", roman: "ira", meaning: "sun" } },
        { letter: "ඊ", roman: "ī", sound: "like the ee in “see”", ipa: "iː", example: { word: "ඊයේ", roman: "īyē", meaning: "yesterday" } },
        { letter: "උ", roman: "u", sound: "like the u in “put”", ipa: "u", example: { word: "උදේ", roman: "udē", meaning: "morning" } },
        { letter: "ඌ", roman: "ū", sound: "like the oo in “food”", ipa: "uː", example: { word: "ඌරා", roman: "ūrā", meaning: "pig" } },
        { letter: "එ", roman: "e", sound: "like the e in “bed”", ipa: "e", example: { word: "එළවළු", roman: "eḷavaḷu", meaning: "vegetables" } },
        { letter: "ඒ", roman: "ē", sound: "like “ay” in “say”, without sliding into a y", ipa: "eː", example: { word: "ඒක", roman: "ēka", meaning: "that (thing)" } },
        { letter: "ඓ", roman: "ai", sound: "like the i in “kite”", ipa: "ai", example: { word: "ඓතිහාසික", roman: "aitihāsika", meaning: "historical" } },
        { letter: "ඔ", roman: "o", sound: "a short o, as in “for” said quickly", ipa: "o", example: { word: "ඔව්", roman: "ow", meaning: "yes" } },
        { letter: "ඕ", roman: "ō", sound: "like the o in “go”, without sliding into a w", ipa: "oː", example: { word: "ඕනෑ", roman: "ōnǣ", meaning: "want, need" } },
        { letter: "ඖ", roman: "au", sound: "like the ow in “cow”", ipa: "au", example: { word: "ඖෂධ", roman: "auṣadha", meaning: "medicine" } },
        { letter: "ඍ", roman: "ṛ", sound: "said “ru” — only in words from Sanskrit", ipa: "ru", example: { word: "ඍතුව", roman: "ṛtuva", meaning: "season" } },
      ],
    },
    {
      title: "Everyday consonants",
      native: "ව්‍යඤ්ජන · vyañjana",
      intro: "Shown with the built-in short 'a'. Watch the two t's and d's: ත/ද touch the teeth, ට/ඩ curl the tongue back.",
      letters: [
        { letter: "ක", roman: "ka", sound: "k as in “skip” — no puff of air", ipa: "k", example: { word: "කන්න", roman: "kanna", meaning: "to eat" } },
        { letter: "ග", roman: "ga", sound: "g as in “go”", ipa: "ɡ", example: { word: "ගෙදර", roman: "gedara", meaning: "home" } },
        { letter: "ඟ", roman: "n̆ga", sound: "a quick “ng” before the g, as in “finger”", ipa: "ᵑɡ", example: { word: "සඟරාව", roman: "san̆garāva", meaning: "magazine" } },
        { letter: "ච", roman: "ca", sound: "ch as in “church”", ipa: "tʃ", example: { word: "චූටි", roman: "chūṭi", meaning: "tiny" } },
        { letter: "ජ", roman: "ja", sound: "j as in “jam”", ipa: "dʒ", example: { word: "ජනේලය", roman: "janēlaya", meaning: "window" } },
        { letter: "ට", roman: "ṭa", sound: "t with the tongue curled back to the roof of the mouth", ipa: "ʈ", example: { word: "ටිකක්", roman: "ṭikak", meaning: "a little" } },
        { letter: "ඩ", roman: "ḍa", sound: "d with the tongue curled back", ipa: "ɖ", example: { word: "ඩිංගක්", roman: "ḍiṅgak", meaning: "a tiny bit (colloquial)" } },
        { letter: "ණ", roman: "ṇa", sound: "today said just like න (n)", ipa: "n", example: { word: "ගණන", roman: "gaṇana", meaning: "amount, price" } },
        { letter: "ඬ", roman: "n̆ḍa", sound: "a quick “n” before a curled-back d", ipa: "ⁿɖ", example: { word: "හඬ", roman: "han̆ḍa", meaning: "voice, sound" } },
        { letter: "ත", roman: "ta", sound: "t with the tongue touching the back of the top teeth", ipa: "t̪", example: { word: "තේ", roman: "tē", meaning: "tea" } },
        { letter: "ද", roman: "da", sound: "d with the tongue touching the teeth", ipa: "d̪", example: { word: "දවස", roman: "davasa", meaning: "day" } },
        { letter: "න", roman: "na", sound: "n as in “no”", ipa: "n", example: { word: "නංගී", roman: "naṅgī", meaning: "younger sister" } },
        { letter: "ඳ", roman: "n̆da", sound: "a quick “n” before a teeth d, as in “and”", ipa: "ⁿd̪", example: { word: "හඳ", roman: "han̆da", meaning: "moon" } },
        { letter: "ප", roman: "pa", sound: "p as in “spin” — no puff of air", ipa: "p", example: { word: "පාන්", roman: "pān", meaning: "bread" } },
        { letter: "බ", roman: "ba", sound: "b as in “bat”", ipa: "b", example: { word: "බත්", roman: "bat", meaning: "rice" } },
        { letter: "ම", roman: "ma", sound: "m as in “mat”", ipa: "m", example: { word: "මල", roman: "mala", meaning: "flower" } },
        { letter: "ඹ", roman: "m̆ba", sound: "a quick “m” before the b, as in “amber”", ipa: "ᵐb", example: { word: "අඹ", roman: "am̆ba", meaning: "mango" } },
        { letter: "ය", roman: "ya", sound: "y as in “yes”", ipa: "j", example: { word: "යාළුවා", roman: "yāḷuvā", meaning: "friend" } },
        { letter: "ර", roman: "ra", sound: "a light, tapped r", ipa: "ɾ", example: { word: "රට", roman: "raṭa", meaning: "country" } },
        { letter: "ල", roman: "la", sound: "l as in “let”", ipa: "l", example: { word: "ලස්සන", roman: "lassana", meaning: "beautiful" } },
        { letter: "ව", roman: "va", sound: "between v and w — lips barely touching", ipa: "ʋ", example: { word: "වතුර", roman: "vatura", meaning: "water" } },
        { letter: "ස", roman: "sa", sound: "s as in “sun”", ipa: "s", example: { word: "සතුට", roman: "satuṭa", meaning: "happiness" } },
        { letter: "හ", roman: "ha", sound: "h as in “hat”", ipa: "h", example: { word: "හත", roman: "hata", meaning: "seven" } },
        { letter: "ළ", roman: "ḷa", sound: "today said just like ල (l)", ipa: "l", example: { word: "ළමයා", roman: "ḷamayā", meaning: "child" } },
        { letter: "ෆ", roman: "fa", sound: "f as in “fan” — for borrowed words", ipa: "f", example: { word: "ෆෝන්", roman: "fōn", meaning: "phone" } },
      ],
    },
    {
      title: "Two signs to know",
      intro: "Not letters on their own, but on almost every line of text.",
      letters: [
        { letter: "ං", roman: "ṃ", sound: "“ng” as in “sing”, added after a letter", ipa: "ŋ", example: { word: "සිංහල", roman: "siṃhala", meaning: "Sinhala" } },
        { letter: "්", roman: "(no vowel)", sound: "hal kirīma: removes the built-in a, so ක් is just “k”", ipa: "—", example: { word: "බත්", roman: "bat", meaning: "rice" } },
      ],
    },
    {
      title: "Aspirated and formal letters",
      native: "මහාප්‍රාණ · mahāprāṇa",
      intro: "Mostly in words from Sanskrit and Pali. In everyday speech most are said like their plain partners above; ශ and ෂ are both “sh”.",
      letters: [
        { letter: "ඛ", roman: "kha", sound: "said like ක (k)", ipa: "k" },
        { letter: "ඝ", roman: "gha", sound: "said like ග (g)", ipa: "ɡ", example: { word: "ඝෝෂාව", roman: "ghōṣāva", meaning: "noise" } },
        { letter: "ඡ", roman: "cha", sound: "said like ච (ch)", ipa: "tʃ", example: { word: "ඡායාරූපය", roman: "chāyārūpaya", meaning: "photograph" } },
        { letter: "ඣ", roman: "jha", sound: "said like ජ (j)", ipa: "dʒ" },
        { letter: "ඤ", roman: "ña", sound: "“ny” as in “canyon”", ipa: "ɲ" },
        { letter: "ඥ", roman: "gña", sound: "“gny” — said “gn-ya”", ipa: "ɡɲ", example: { word: "ඥාතියා", roman: "gnyātiyā", meaning: "relative" } },
        { letter: "ඨ", roman: "ṭha", sound: "said like ට (curled-back t)", ipa: "ʈ", example: { word: "ශ්‍රේෂ්ඨ", roman: "śrēṣṭha", meaning: "excellent" } },
        { letter: "ඪ", roman: "ḍha", sound: "said like ඩ (curled-back d)", ipa: "ɖ" },
        { letter: "ථ", roman: "tha", sound: "said like ත (teeth t)", ipa: "t̪", example: { word: "ස්ථානය", roman: "sthānaya", meaning: "place" } },
        { letter: "ධ", roman: "dha", sound: "said like ද (teeth d)", ipa: "d̪", example: { word: "ධර්මය", roman: "dharmaya", meaning: "the Dhamma, teaching" } },
        { letter: "ඵ", roman: "pha", sound: "said like ප (p)", ipa: "p", example: { word: "ඵලය", roman: "phalaya", meaning: "fruit, result" } },
        { letter: "භ", roman: "bha", sound: "said like බ (b)", ipa: "b", example: { word: "භාෂාව", roman: "bhāṣāva", meaning: "language" } },
        { letter: "ශ", roman: "śa", sound: "sh as in “ship”", ipa: "ʃ", example: { word: "ශ්‍රී", roman: "śrī", meaning: "Sri (as in Sri Lanka)" } },
        { letter: "ෂ", roman: "ṣa", sound: "also sh as in “ship”", ipa: "ʃ", example: { word: "භාෂාව", roman: "bhāṣāva", meaning: "language" } },
      ],
    },
  ],
  vowelSigns: {
    base: "ක",
    intro: "After a consonant, a vowel is written as a sign (pilla) around the letter instead of in full. Here they are on ක (ka).",
    signs: [
      { form: "ක", roman: "ka" },
      { form: "කා", roman: "kā" },
      { form: "කැ", roman: "kæ" },
      { form: "කෑ", roman: "kǣ" },
      { form: "කි", roman: "ki" },
      { form: "කී", roman: "kī" },
      { form: "කු", roman: "ku" },
      { form: "කූ", roman: "kū" },
      { form: "කෙ", roman: "ke" },
      { form: "කේ", roman: "kē" },
      { form: "කෛ", roman: "kai" },
      { form: "කො", roman: "ko" },
      { form: "කෝ", roman: "kō" },
      { form: "කෞ", roman: "kau" },
      { form: "ක්", roman: "k" },
    ],
  },
};

export const tamilAlphabet: AlphabetSheet = {
  language: "tamil",
  name: "Tamil",
  native: "தமிழ் எழுத்துகள்",
  intro:
    "Tamil has 12 vowels and 18 consonants; together they make the 216 combined letters you see in text. One letter often stands for two related sounds: க is “k” at the start of a word and “g” or a soft “h” between vowels, and you learn which by ear.",
  voiceLangs: ["ta-LK", "ta-IN", "ta"],
  groups: [
    {
      title: "Vowels",
      native: "உயிர் எழுத்துகள் · uyir eḻuttukaḷ",
      intro: "“Life letters”. Short and long pairs: the long one is held for longer, and length changes meaning.",
      letters: [
        { letter: "அ", roman: "a", sound: "like the u in “cup”", ipa: "a", example: { word: "அம்மா", roman: "ammā", meaning: "mother" } },
        { letter: "ஆ", roman: "ā", sound: "like the a in “father”", ipa: "aː", example: { word: "ஆடு", roman: "āṭu", meaning: "goat" } },
        { letter: "இ", roman: "i", sound: "like the i in “sit”", ipa: "i", example: { word: "இலை", roman: "ilai", meaning: "leaf" } },
        { letter: "ஈ", roman: "ī", sound: "like the ee in “see”", ipa: "iː", example: { word: "ஈ", roman: "ī", meaning: "housefly" } },
        { letter: "உ", roman: "u", sound: "like the u in “put”", ipa: "u", example: { word: "உப்பு", roman: "uppu", meaning: "salt" } },
        { letter: "ஊ", roman: "ū", sound: "like the oo in “food”", ipa: "uː", example: { word: "ஊர்", roman: "ūr", meaning: "home town, village" } },
        { letter: "எ", roman: "e", sound: "like the e in “bed”", ipa: "e", example: { word: "எலி", roman: "eli", meaning: "rat" } },
        { letter: "ஏ", roman: "ē", sound: "like “ay” in “say”, without sliding into a y", ipa: "eː", example: { word: "ஏணி", roman: "ēṇi", meaning: "ladder" } },
        { letter: "ஐ", roman: "ai", sound: "like the i in “kite”", ipa: "ai", example: { word: "ஐந்து", roman: "aintu", meaning: "five" } },
        { letter: "ஒ", roman: "o", sound: "a short o, as in “for” said quickly", ipa: "o", example: { word: "ஒன்று", roman: "oṉṟu", meaning: "one" } },
        { letter: "ஓ", roman: "ō", sound: "like the o in “go”, without sliding into a w", ipa: "oː", example: { word: "ஓடு", roman: "ōṭu", meaning: "run" } },
        { letter: "ஔ", roman: "au", sound: "like the ow in “cow”", ipa: "au", example: { word: "ஔவையார்", roman: "auvaiyār", meaning: "Avvaiyar, the poet" } },
      ],
    },
    {
      title: "Hard consonants",
      native: "வல்லினம் · vallinam",
      intro: "Each has a hard sound at the start of a word or doubled, and a softer one between vowels.",
      letters: [
        { letter: "க", roman: "ka", sound: "k at the start; g or a soft h between vowels", ipa: "k ~ ɡ ~ h", example: { word: "கடல்", roman: "kaṭal", meaning: "sea" } },
        { letter: "ச", roman: "ca", sound: "usually s at the start of a word; ch when doubled", ipa: "s ~ tʃ", example: { word: "சாப்பாடு", roman: "cāppāṭu (said sāppāḍu)", meaning: "food, a meal" } },
        { letter: "ட", roman: "ṭa", sound: "t with the tongue curled back; d between vowels", ipa: "ʈ ~ ɖ", example: { word: "வீடு", roman: "vīṭu (said vīḍu)", meaning: "house" } },
        { letter: "த", roman: "ta", sound: "t with the tongue against the teeth; a soft “th” as in “this” between vowels", ipa: "t̪ ~ ð", example: { word: "தண்ணீர்", roman: "taṇṇīr", meaning: "water" } },
        { letter: "ப", roman: "pa", sound: "p at the start; b between vowels", ipa: "p ~ b", example: { word: "பால்", roman: "pāl", meaning: "milk" } },
        { letter: "ற", roman: "ṟa", sound: "a strong, trilled r; doubled (ற்ற) it sounds like “ttr”", ipa: "r", example: { word: "ஆறு", roman: "āṟu", meaning: "river; six" } },
      ],
    },
    {
      title: "Soft consonants",
      native: "மெல்லினம் · mellinam",
      intro: "The nasals. Tamil has three n's you use every day: ந (teeth), ண (curled back), ன (just behind the teeth).",
      letters: [
        { letter: "ங", roman: "ṅa", sound: "“ng” as in “sing” — almost always before க", ipa: "ŋ", example: { word: "சிங்கம்", roman: "ciṅkam (said singam)", meaning: "lion" } },
        { letter: "ஞ", roman: "ña", sound: "“ny” as in “canyon”", ipa: "ɲ", example: { word: "ஞாயிறு", roman: "ñāyiṟu", meaning: "Sunday; the sun" } },
        { letter: "ண", roman: "ṇa", sound: "n with the tongue curled back", ipa: "ɳ", example: { word: "கண்", roman: "kaṇ", meaning: "eye" } },
        { letter: "ந", roman: "na", sound: "n with the tongue on the teeth — mostly at the start of words", ipa: "n̪", example: { word: "நன்றி", roman: "naṉṟi", meaning: "thank you" } },
        { letter: "ம", roman: "ma", sound: "m as in “mat”", ipa: "m", example: { word: "மழை", roman: "maḻai", meaning: "rain" } },
        { letter: "ன", roman: "ṉa", sound: "n as in “no” — inside and at the end of words", ipa: "n", example: { word: "மீன்", roman: "mīṉ", meaning: "fish" } },
      ],
    },
    {
      title: "Middle consonants",
      native: "இடையினம் · iṭaiyiṉam",
      intro: "Including ழ, the sound Tamil is famous for — practise it with your tutor.",
      letters: [
        { letter: "ய", roman: "ya", sound: "y as in “yes”", ipa: "j", example: { word: "யானை", roman: "yāṉai", meaning: "elephant" } },
        { letter: "ர", roman: "ra", sound: "a light, tapped r", ipa: "ɾ", example: { word: "மரம்", roman: "maram", meaning: "tree" } },
        { letter: "ல", roman: "la", sound: "l as in “let”", ipa: "l", example: { word: "பல்", roman: "pal", meaning: "tooth" } },
        { letter: "வ", roman: "va", sound: "between v and w", ipa: "ʋ", example: { word: "வணக்கம்", roman: "vaṇakkam", meaning: "hello" } },
        { letter: "ழ", roman: "ḻa", sound: "curl the tongue far back and say an r–l without touching the roof — often written “zh”", ipa: "ɻ", example: { word: "தமிழ்", roman: "tamiḻ", meaning: "Tamil" } },
        { letter: "ள", roman: "ḷa", sound: "l with the tongue curled back", ipa: "ɭ", example: { word: "பள்ளி", roman: "paḷḷi", meaning: "school" } },
      ],
    },
    {
      title: "Two marks to know",
      intro: "",
      letters: [
        { letter: "ஃ", roman: "ḵ", sound: "āytam: a soft breathy h, in a handful of words", ipa: "x ~ h", example: { word: "எஃகு", roman: "eḵku", meaning: "steel" } },
        { letter: "்", roman: "(no vowel)", sound: "puḷḷi: the dot that removes the built-in a, so க் is just “k”", ipa: "—", example: { word: "பால்", roman: "pāl", meaning: "milk" } },
      ],
    },
    {
      title: "Grantha letters",
      native: "கிரந்த எழுத்துகள்",
      intro: "Borrowed for sounds from Sanskrit and English. Common in names and newer words.",
      letters: [
        { letter: "ஜ", roman: "ja", sound: "j as in “jam”", ipa: "dʒ", example: { word: "ஜன்னல்", roman: "jaṉṉal", meaning: "window" } },
        { letter: "ஷ", roman: "ṣa", sound: "sh as in “ship”", ipa: "ʂ", example: { word: "பாஷை", roman: "pāṣai", meaning: "language" } },
        { letter: "ஸ", roman: "sa", sound: "s as in “sun”", ipa: "s", example: { word: "பஸ்", roman: "pas", meaning: "bus" } },
        { letter: "ஹ", roman: "ha", sound: "h as in “hat”", ipa: "h", example: { word: "ஹோட்டல்", roman: "hōṭṭal", meaning: "hotel; a place to eat" } },
        { letter: "க்ஷ", roman: "kṣa", sound: "“ksh”", ipa: "kʂ" },
        { letter: "ஸ்ரீ", roman: "śrī", sound: "“shree”", ipa: "ʃɾiː", example: { word: "ஸ்ரீலங்கா", roman: "srī laṅkā", meaning: "Sri Lanka" } },
      ],
    },
  ],
  vowelSigns: {
    base: "க",
    intro: "After a consonant, a vowel becomes a sign around the letter. Here they are on க (ka). Watch out: the u and ū forms change shape from consonant to consonant.",
    signs: [
      { form: "க", roman: "ka" },
      { form: "கா", roman: "kā" },
      { form: "கி", roman: "ki" },
      { form: "கீ", roman: "kī" },
      { form: "கு", roman: "ku" },
      { form: "கூ", roman: "kū" },
      { form: "கெ", roman: "ke" },
      { form: "கே", roman: "kē" },
      { form: "கை", roman: "kai" },
      { form: "கொ", roman: "ko" },
      { form: "கோ", roman: "kō" },
      { form: "கௌ", roman: "kau" },
      { form: "க்", roman: "k" },
    ],
  },
};

export const alphabetSheets = [sinhalaAlphabet, tamilAlphabet];

/**
 * The file name a letter's (or word's) recorded audio is stored under: its
 * Unicode code points, so it is stable and safe in a URL. Shared by the
 * audio generator (scripts/generate-alphabet-audio.mjs) and the page.
 */
export function audioKey(text: string): string {
  return Array.from(text)
    .map((char) => char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"))
    .join("-");
}
