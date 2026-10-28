import type { Holiday } from "../../../shared/types.ts";

/**
 * Sri Lanka's gazetted public holidays for 2026, from the original
 * serendib.learn site — what a fresh database starts with. Poya (full moon)
 * dates and lunar-calendar Muslim observances are set each year, so admins
 * update them in the portal's content editor. Only read to fill an empty
 * `holidays` collection; the site never imports this file.
 */
const holidays2026: Omit<Holiday, "id" | "updatedAt">[] = [
  {
    date: "2026-01-03",
    name: "Duruthu Full Moon Poya Day",
    category: "poya",
    funFact:
      "Marks the Buddha's legendary first visit to Sri Lanka. Colombo's Kelaniya temple holds the Duruthu Perahera procession to commemorate it.",
  },
  {
    date: "2026-01-15",
    name: "Tamil Thai Pongal Day",
    category: "hindu",
    funFact:
      "A Tamil harvest festival - families cook the first rice of the season in a clay pot until it boils over, shouting \"Pongalo Pongal!\" for good luck.",
  },
  {
    date: "2026-02-01",
    name: "Navam Full Moon Poya Day",
    category: "poya",
    funFact:
      "Colombo's Gangaramaya Temple holds the Navam Perahera, one of the city's largest processions, with elephants, drummers, and dancers.",
  },
  {
    date: "2026-02-04",
    name: "Independence Day",
    category: "national",
    funFact:
      "Marks Sri Lanka's independence from British rule in 1948. A national parade is held in Colombo every year.",
  },
  {
    date: "2026-02-15",
    name: "Mahasivarathri Day",
    category: "hindu",
    funFact:
      "A Hindu night-long vigil honouring the god Shiva, observed with fasting and prayer at temples across the island.",
  },
  {
    date: "2026-03-02",
    name: "Madin Full Moon Poya Day",
    category: "poya",
    funFact:
      "Commemorates the Buddha's first return visit to his father's kingdom after attaining enlightenment.",
  },
  {
    date: "2026-03-21",
    name: "Id-Ul-Fitr (Ramazan Festival Day)",
    category: "muslim",
    funFact:
      "Marks the end of the fasting month of Ramadan - families gather for a festive meal after a month of dawn-to-dusk fasting.",
  },
  {
    date: "2026-04-01",
    name: "Bak Full Moon Poya Day",
    category: "poya",
    funFact:
      "Marks the Buddha's third visit to Sri Lanka, when he is said to have settled a dispute between two rival chieftains.",
  },
  {
    date: "2026-04-03",
    name: "Good Friday",
    category: "christian",
    funFact:
      "A Christian holiday observed by Sri Lanka's Catholic and Christian communities, marking the crucifixion of Jesus.",
  },
  {
    date: "2026-04-13",
    name: "Day prior to Sinhala & Tamil New Year",
    category: "national",
    funFact:
      "The calm before the celebration - households finish cleaning, cooking, and preparing for the New Year's exact auspicious moment.",
  },
  {
    date: "2026-04-14",
    name: "Sinhala and Tamil New Year Day",
    category: "national",
    funFact:
      "Known as Aluth Avurudu, this is Sri Lanka's biggest secular festival, celebrated by Sinhalese and Tamil families alike with games, oil-lamp lighting, and sweets like kokis and kavum.",
  },
  {
    date: "2026-05-01",
    name: "Vesak Full Moon Poya Day",
    category: "poya",
    funFact:
      "The most important day on the Buddhist calendar - it marks the Buddha's birth, enlightenment, and passing all at once. Streets fill with paper lanterns and free food stalls called dansalas.",
  },
  {
    date: "2026-05-02",
    name: "Day following Vesak Full Moon Poya Day",
    category: "poya",
    funFact: "An extra day to keep the Vesak lanterns lit and the celebrations going.",
  },
  {
    date: "2026-05-28",
    name: "Id-Ul-Alha (Hadji Festival Day)",
    category: "muslim",
    funFact:
      "Also called the Festival of Sacrifice, it honours the Prophet Ibrahim's willingness to obey God - families share meals with relatives and those in need.",
  },
  {
    date: "2026-05-30",
    name: "Adhi Poson Full Moon Poya Day",
    category: "poya",
    funFact: "An extra Poya day this year, a month before the main Poson observance.",
  },
  {
    date: "2026-06-29",
    name: "Poson Full Moon Poya Day",
    category: "poya",
    funFact:
      "Marks the arrival of Buddhism in Sri Lanka over 2,000 years ago. Thousands of pilgrims climb the sacred rock at Mihintale, near Anuradhapura.",
  },
  {
    date: "2026-07-29",
    name: "Esala Full Moon Poya Day",
    category: "poya",
    funFact:
      "Kicks off the Kandy Esala Perahera - a spectacular ten-night procession of elephants, drummers, and fire dancers honouring the Sacred Tooth Relic.",
  },
  {
    date: "2026-08-26",
    name: "Milad-Un-Nabi (Holy Prophet's Birthday)",
    category: "muslim",
    funFact: "Celebrates the birthday of the Prophet Muhammad with prayers and gatherings.",
  },
  {
    date: "2026-08-27",
    name: "Nikini Full Moon Poya Day",
    category: "poya",
    funFact: "Traditionally when Buddhist monks begin their three-month annual retreat, Vas.",
  },
  {
    date: "2026-09-26",
    name: "Binara Full Moon Poya Day",
    category: "poya",
    funFact: "Commemorates the Buddha's visit to heaven to teach his mother the Abhidhamma.",
  },
  {
    date: "2026-10-25",
    name: "Vap Full Moon Poya Day",
    category: "poya",
    funFact: "Marks the end of the monks' three-month retreat and the Katina robe-offering season that follows.",
  },
  {
    date: "2026-11-08",
    name: "Deepavali Festival Day",
    category: "hindu",
    funFact:
      "The Hindu festival of lights - oil lamps are lit in doorways and fireworks light up the sky to celebrate light's victory over darkness.",
  },
  {
    date: "2026-11-24",
    name: "Ill Full Moon Poya Day",
    category: "poya",
    funFact: "Marks the Buddha's ordination of sixty disciples and sending them out to teach.",
  },
  {
    date: "2026-12-23",
    name: "Unduvap Full Moon Poya Day",
    category: "poya",
    funFact:
      "Commemorates the arrival of the Sacred Bodhi Tree sapling in Sri Lanka, still growing today in Anuradhapura as one of the oldest documented trees on Earth.",
  },
  {
    date: "2026-12-25",
    name: "Christmas Day",
    category: "christian",
    funFact:
      "Celebrated by Sri Lanka's Christian community and joined in by many others - towns like Negombo light up with elaborate decorations.",
  },
];

export const holidaySeed: Omit<Holiday, "updatedAt">[] = holidays2026.map((holiday) => ({
  ...holiday,
  id: `hol_${holiday.date}_${holiday.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
}));
