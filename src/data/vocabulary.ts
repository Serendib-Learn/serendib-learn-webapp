import type { LanguageCode } from "@/lib/types";

export interface Phrase {
  n: number;
  english: string;
  sinhala: string;
  sinhalaRoman: string;
  tamil: string;
  tamilRoman: string;
  note?: string;
}

export interface Chapter {
  id: string;
  number: number;
  emoji: string;
  title: string;
  scene: string;
  phrases: Phrase[];
}

export interface Phase {
  id: string;
  name: string;
  blurb: string;
  chapters: Chapter[];
}

export function scriptOf(phrase: Phrase, language: LanguageCode): string {
  return language === "sinhala" ? phrase.sinhala : phrase.tamil;
}

export function romanOf(phrase: Phrase, language: LanguageCode): string {
  return language === "sinhala" ? phrase.sinhalaRoman : phrase.tamilRoman;
}

const chapters: Chapter[] = [
  {
    id: "arriving",
    number: 1,
    emoji: "✈️",
    title: "Arriving",
    scene:
      "You land at Bandaranaike Airport. Get through immigration with grace.",
    phrases: [
      {
        n: 1,
        english: "Hello",
        sinhala: "ආයුබෝවන්",
        sinhalaRoman: "Ayubowan",
        tamil: "வணக்கம்",
        tamilRoman: "Vanakkam",
        note: "The all-purpose greeting — palms together, slight nod.",
      },
      {
        n: 2,
        english: "Thank you",
        sinhala: "බොහොම ස්තූතියි",
        sinhalaRoman: "Bohoma stuti",
        tamil: "நன்றி",
        tamilRoman: "Nandri",
      },
      {
        n: 3,
        english: "Excuse me",
        sinhala: "සමාවෙන්න",
        sinhalaRoman: "Samaawenna",
        tamil: "மன்னிக்கவும்",
        tamilRoman: "Mannikkavum",
      },
      {
        n: 4,
        english: "Yes",
        sinhala: "ඔව්",
        sinhalaRoman: "Ow",
        tamil: "ஆமாம்",
        tamilRoman: "Aamaam",
      },
      {
        n: 5,
        english: "No",
        sinhala: "නෑ",
        sinhalaRoman: "Naha",
        tamil: "இல்லை",
        tamilRoman: "Illai",
      },
      {
        n: 6,
        english: "Sorry",
        sinhala: "සමාවෙන්න",
        sinhalaRoman: "Samaawenna",
        tamil: "மன்னிக்கவும்",
        tamilRoman: "Mannikkavum",
      },
      {
        n: 7,
        english: "I don't understand",
        sinhala: "මට තේරෙන්නේ නෑ",
        sinhalaRoman: "Mata therenney naha",
        tamil: "எனக்குப் புரியவில்லை",
        tamilRoman: "Enakku puriyavillai",
      },
      {
        n: 8,
        english: "Can you repeat that?",
        sinhala: "ආයෙත් කියන්න පුළුවන්ද?",
        sinhalaRoman: "Aayeth kiyanna puluvanda?",
        tamil: "மீண்டும் சொல்ல முடியுமா?",
        tamilRoman: "Meendum solla mudiyumaa?",
      },
      {
        n: 9,
        english: "I speak a little",
        sinhala: "මම ටිකක් කතාකරනවා",
        sinhalaRoman: "Mama tikak kathaakaranava",
        tamil: "நான் கொஞ்சம் பேசுவேன்",
        tamilRoman: "Naan konjam pesuven",
        note: "Softens the conversation — most people will smile and slow down.",
      },
    ],
  },
  {
    id: "finding-your-driver",
    number: 2,
    emoji: "🧳",
    title: "Finding your driver",
    scene: "Someone at arrivals is holding a card with your name.",
    phrases: [
      {
        n: 1,
        english: "Are you my driver?",
        sinhala: "ඔයා මගේ රියදුරාද?",
        sinhalaRoman: "Oyaa mage riyaduraadha?",
        tamil: "நீங்கள் என் ஓட்டுநர்-ஆ?",
        tamilRoman: "Neenga en driver-aa?",
      },
      {
        n: 2,
        english: "Where are we going?",
        sinhala: "අපි කොහෙද යන්නේ?",
        sinhalaRoman: "Api koheda yanne?",
        tamil: "நாங்க எங்கே போறோம்?",
        tamilRoman: "Naanga enge porom?",
      },
      {
        n: 3,
        english: "How long will it take?",
        sinhala: "කොච්චර වෙලාවක් යනවද?",
        sinhalaRoman: "Kochchara welaawak yanavada?",
        tamil: "எவ்வளவு நேரம் ஆகும்?",
        tamilRoman: "Evvalavu neram aagum?",
      },
      {
        n: 4,
        english: "What is the cost for the trip?",
        sinhala: "ගමනට කීයද?",
        sinhalaRoman: "Gamanata kiiyada?",
        tamil: "பயணத்திற்கு எவ்வளவு?",
        tamilRoman: "Payanaththirku evvalavu?",
      },
      {
        n: 5,
        english: "Can we stop for a bathroom?",
        sinhala: "වැසිකිළියට නවත්තන්න පුළුවන්ද?",
        sinhalaRoman: "Wesikiliyata nawaththanna puluvanda?",
        tamil: "கழிவறைக்கு நிறுத்த முடியுமா?",
        tamilRoman: "Kazhivaraiku niruththa mudiyumaa?",
      },
      {
        n: 6,
        english: "Thank you",
        sinhala: "බොහොම ස්තූතියි",
        sinhalaRoman: "Bohoma stuti",
        tamil: "நன்றி",
        tamilRoman: "Nandri",
      },
    ],
  },
  {
    id: "tuk-tuk-adventure",
    number: 3,
    emoji: "🛺",
    title: "Tuk tuk adventure",
    scene: "You flag a tuk. Negotiate the fare, then get where you're going.",
    phrases: [
      {
        n: 1,
        english: "How much?",
        sinhala: "කීයද?",
        sinhalaRoman: "Kiiyada?",
        tamil: "எவ்வளவு?",
        tamilRoman: "Evvalavu?",
      },
      {
        n: 2,
        english: "Too expensive",
        sinhala: "හරි ගාණයි",
        sinhalaRoman: "Hari gaanai",
        tamil: "ரொம்ப அதிகம்",
        tamilRoman: "Romba adhigam",
      },
      {
        n: 3,
        english: "Can you use the meter?",
        sinhala: "මීටරය දාන්න පුළුවන්ද?",
        sinhalaRoman: "Meetereya daanna puluvanda?",
        tamil: "மீட்டர் போடுங்க",
        tamilRoman: "Meter podunga",
      },
      {
        n: 4,
        english: "Can you take me to…",
        sinhala: "මාව …ට අරගෙන යන්න",
        sinhalaRoman: "Maawa …ta aragena yanna",
        tamil: "என்னை …க்கு கூட்டிட்டு போங்க",
        tamilRoman: "Ennai …ku kootittu ponga",
      },
      {
        n: 5,
        english: "Turn left",
        sinhala: "වමට හැරෙන්න",
        sinhalaRoman: "Wamata harenna",
        tamil: "இடதுபக்கம் திரும்புங்க",
        tamilRoman: "Idadhu pakkam thirumbunga",
      },
      {
        n: 6,
        english: "Turn right",
        sinhala: "දකුණට හැරෙන්න",
        sinhalaRoman: "Dakunata harenna",
        tamil: "வலதுபக்கம் திரும்புங்க",
        tamilRoman: "Valadhu pakkam thirumbunga",
      },
      {
        n: 7,
        english: "Stop here",
        sinhala: "මෙතන නවත්තන්න",
        sinhalaRoman: "Methana nawaththanna",
        tamil: "இங்கே நிறுத்துங்க",
        tamilRoman: "Inge niruththunga",
      },
      {
        n: 8,
        english: "A bit faster",
        sinhala: "ටිකක් වේගෙන්",
        sinhalaRoman: "Tikak wegen",
        tamil: "கொஞ்சம் வேகமா",
        tamilRoman: "Konjam vegamaa",
      },
      {
        n: 9,
        english: "A bit slower",
        sinhala: "ටිකක් හෙමින්",
        sinhalaRoman: "Tikak hemin",
        tamil: "கொஞ்சம் மெல்லமா",
        tamilRoman: "Konjam mellamaa",
      },
      {
        n: 10,
        english: "Wait here",
        sinhala: "මෙතන ඉන්න",
        sinhalaRoman: "Methana inna",
        tamil: "இங்கே காத்திருங்க",
        tamilRoman: "Inge kaaththirunga",
      },
    ],
  },
  {
    id: "at-the-shop",
    number: 4,
    emoji: "🛍️",
    title: "At the shop",
    scene: "Buying water and snacks at a corner kade. Cash or card?",
    phrases: [
      {
        n: 1,
        english: "Water",
        sinhala: "වතුර",
        sinhalaRoman: "Wathura",
        tamil: "தண்ணீர்",
        tamilRoman: "Thanneer",
      },
      {
        n: 2,
        english: "Biscuits",
        sinhala: "බිස්කට්",
        sinhalaRoman: "Biskat",
        tamil: "பிஸ்கட்",
        tamilRoman: "Biskat",
      },
      {
        n: 3,
        english: "SIM card",
        sinhala: "සිම් එකක්",
        sinhalaRoman: "Sim ekak",
        tamil: "சிம் கார்டு",
        tamilRoman: "Sim card",
      },
      {
        n: 4,
        english: "A bag, please",
        sinhala: "බෑග් එකක් දෙන්න",
        sinhalaRoman: "Bag ekak denna",
        tamil: "ஒரு பை கொடுங்க",
        tamilRoman: "Oru pai kodunga",
      },
      {
        n: 5,
        english: "I don't have cash",
        sinhala: "සල්ලි නෑ",
        sinhalaRoman: "Salli naha",
        tamil: "பணம் இல்லை",
        tamilRoman: "Panam illai",
      },
      {
        n: 6,
        english: "How much?",
        sinhala: "කීයද?",
        sinhalaRoman: "Kiiyada?",
        tamil: "எவ்வளவு?",
        tamilRoman: "Evvalavu?",
      },
      {
        n: 7,
        english: "Do you take card?",
        sinhala: "කාඩ් ගන්නවද?",
        sinhalaRoman: "Card gannawada?",
        tamil: "கார்டு எடுக்கிறீங்களா?",
        tamilRoman: "Card edukkireengalaa?",
      },
      {
        n: 8,
        english: "Keep the change",
        sinhala: "ඉතුරු තියාගන්න",
        sinhalaRoman: "Ithuru thiyaaganna",
        tamil: "மீதி வச்சுக்கோங்க",
        tamilRoman: "Meedhi vachchukkonga",
      },
    ],
  },
  {
    id: "ordering-food",
    number: 5,
    emoji: "🍛",
    title: "Ordering food",
    scene: "Kottu, hoppers, rice and curry — and 'no chilli' when you need it.",
    phrases: [
      {
        n: 1,
        english: "One chicken kottu",
        sinhala: "චිකන් කොත්තු එකක්",
        sinhalaRoman: "Chicken kottu ekak",
        tamil: "ஒரு சிக்கன் கொத்து",
        tamilRoman: "Oru chicken kottu",
      },
      {
        n: 2,
        english: "Rice and curry",
        sinhala: "බත් සහ ව්‍යංජන",
        sinhalaRoman: "Bath saha vyanjana",
        tamil: "சோறும் கறியும்",
        tamilRoman: "Sorum kariyum",
      },
      {
        n: 3,
        english: "Hoppers, please",
        sinhala: "ආප්ප දෙන්න",
        sinhalaRoman: "Aappa denna",
        tamil: "ஆப்பம் கொடுங்க",
        tamilRoman: "Aappam kodunga",
      },
      {
        n: 4,
        english: "Not too spicy",
        sinhala: "වැඩිය සැර එපා",
        sinhalaRoman: "Wediya sara epa",
        tamil: "அதிக காரம் வேண்டாம்",
        tamilRoman: "Adhiga kaaram vendaam",
      },
      {
        n: 5,
        english: "No chilli",
        sinhala: "මිරිස් නෑ",
        sinhalaRoman: "Miris naha",
        tamil: "மிளகாய் வேண்டாம்",
        tamilRoman: "Milagai vendaam",
      },
      {
        n: 6,
        english: "Delicious!",
        sinhala: "රසයි!",
        sinhalaRoman: "Rasai!",
        tamil: "ருசி!",
        tamilRoman: "Ruchi!",
      },
      {
        n: 7,
        english: "Water, please",
        sinhala: "වතුර දෙන්න",
        sinhalaRoman: "Wathura denna",
        tamil: "தண்ணீர் கொடுங்க",
        tamilRoman: "Thanneer kodunga",
      },
      {
        n: 8,
        english: "The bill, please",
        sinhala: "බිල එක දෙන්න",
        sinhalaRoman: "Bila eka denna",
        tamil: "பில் கொடுங்க",
        tamilRoman: "Bill kodunga",
      },
    ],
  },
  {
    id: "finding-the-bathroom",
    number: 6,
    emoji: "🚻",
    title: "Finding the bathroom",
    scene: "A tiny but vital lesson. Ask kindly, understand the directions.",
    phrases: [
      {
        n: 1,
        english: "Where is the bathroom?",
        sinhala: "වැසිකිළිය කොහෙද?",
        sinhalaRoman: "Wesikiliya koheda?",
        tamil: "கழிவறை எங்கே?",
        tamilRoman: "Kazhivarai enge?",
      },
      {
        n: 2,
        english: "Is there a bathroom here?",
        sinhala: "මෙතන වැසිකිළියක් තියෙනවද?",
        sinhalaRoman: "Methana wesikiliyak thiyenawada?",
        tamil: "இங்கே கழிவறை இருக்கா?",
        tamilRoman: "Inge kazhivarai irukkaa?",
      },
      {
        n: 3,
        english: "Left",
        sinhala: "වම",
        sinhalaRoman: "Wama",
        tamil: "இடது",
        tamilRoman: "Idadhu",
      },
      {
        n: 4,
        english: "Right",
        sinhala: "දකුණ",
        sinhalaRoman: "Dakuna",
        tamil: "வலது",
        tamilRoman: "Valadhu",
      },
      {
        n: 5,
        english: "Is it clean?",
        sinhala: "පිරිසිදු ද?",
        sinhalaRoman: "Pirisidu da?",
        tamil: "சுத்தமா?",
        tamilRoman: "Suththamaa?",
      },
      {
        n: 6,
        english: "Thank you very much",
        sinhala: "බොහොම ස්තූතියි",
        sinhalaRoman: "Bohoma stuti",
        tamil: "மிக்க நன்றி",
        tamilRoman: "Mikka nandri",
      },
    ],
  },
  {
    id: "weather-chat",
    number: 7,
    emoji: "☀️",
    title: "Weather chat",
    scene: "Sri Lankans love a weather conversation. Small talk that opens doors.",
    phrases: [
      {
        n: 1,
        english: "It's hot",
        sinhala: "රස්නෙයි",
        sinhalaRoman: "Rasnei",
        tamil: "வெப்பமா இருக்கு",
        tamilRoman: "Veppamaa irukku",
      },
      {
        n: 2,
        english: "A lot of rain",
        sinhala: "වැඩිය වැහි",
        sinhalaRoman: "Wediya wehi",
        tamil: "நிறைய மழை",
        tamilRoman: "Niraiya mazhai",
      },
      {
        n: 3,
        english: "Beautiful weather",
        sinhala: "ලස්සන කාලගුණයක්",
        sinhalaRoman: "Lassana kaalagunayak",
        tamil: "அழகான வானிலை",
        tamilRoman: "Azhagana vaanilai",
      },
      {
        n: 4,
        english: "Very humid",
        sinhala: "වැඩිය තෙතමන",
        sinhalaRoman: "Wediya thethamana",
        tamil: "மிகவும் ஈரப்பதம்",
        tamilRoman: "Migavum eerappadam",
      },
      {
        n: 5,
        english: "It's cold today",
        sinhala: "අද සීතලයි",
        sinhalaRoman: "Ada seethalai",
        tamil: "இன்று குளிர்",
        tamilRoman: "Indru kulir",
      },
      {
        n: 6,
        english: "See you again",
        sinhala: "ආයෙත් හමුවෙමු",
        sinhalaRoman: "Aayeth hamuwemu",
        tamil: "மீண்டும் சந்திப்போம்",
        tamilRoman: "Meendum sandhippom",
      },
    ],
  },
  {
    id: "meeting-relatives",
    number: 8,
    emoji: "🏡",
    title: "Meeting relatives",
    scene: "Ammachi, Seeya, Aiya, Akka — greetings that matter.",
    phrases: [
      {
        n: 1,
        english: "Grandmother",
        sinhala: "ආච්චි",
        sinhalaRoman: "Achchi",
        tamil: "பாட்டி",
        tamilRoman: "Paatti",
      },
      {
        n: 2,
        english: "Grandfather",
        sinhala: "සීයා",
        sinhalaRoman: "Seeya",
        tamil: "தாத்தா",
        tamilRoman: "Thaatha",
      },
      {
        n: 3,
        english: "Older brother",
        sinhala: "අයියා",
        sinhalaRoman: "Aiya",
        tamil: "அண்ணன்",
        tamilRoman: "Annan",
      },
      {
        n: 4,
        english: "Older sister",
        sinhala: "අක්කා",
        sinhalaRoman: "Akka",
        tamil: "அக்கா",
        tamilRoman: "Akka",
      },
      {
        n: 5,
        english: "Little one",
        sinhala: "පුංචි",
        sinhalaRoman: "Punchi",
        tamil: "குட்டி",
        tamilRoman: "Kutti",
      },
      {
        n: 6,
        english: "How are you?",
        sinhala: "කොහොමද?",
        sinhalaRoman: "Kohomada?",
        tamil: "எப்படி இருக்கீங்க?",
        tamilRoman: "Eppadi irukkeenga?",
      },
    ],
  },
];

export const phaseOne: Phase = {
  id: "survival-sri-lanka",
  name: "Survival Sri Lanka",
  blurb:
    "Eight chapters that carry you from the airport gate to your grandmother's front room. Every phrase is one a Sri Lankan would actually say.",
  chapters,
};

export const phases: Phase[] = [phaseOne];

export const allChapters = chapters;

export function getChapter(id: string): Chapter | undefined {
  return chapters.find((chapter) => chapter.id === id);
}

export const totalPhraseCount = chapters.reduce(
  (sum, chapter) => sum + chapter.phrases.length,
  0,
);
