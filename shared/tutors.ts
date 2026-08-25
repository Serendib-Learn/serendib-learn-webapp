import type { LanguageCode } from "./types.ts";

export interface TutorProfile {
  id: string;
  name: string;
  email: string;
  homeTown: string;
  timezone: string;
  yearsTeaching: number;
  hourlyRateUsd: number;
  headline: string;
  bio: string;
  languages: LanguageCode[];
  teaches: string[];
}

/**
 * Shared by the public tutor pages and by the seeded portal accounts, so the
 * marketing site and the portal never drift apart.
 */
export const tutorProfiles: TutorProfile[] = [
  {
    id: "u_nimali",
    name: "Nimali Fernando",
    email: "nimali@serendiblearn.com",
    homeTown: "Moratuwa",
    timezone: "Asia/Colombo",
    yearsTeaching: 8,
    hourlyRateUsd: 28,
    headline: "Sinhala for people who want to talk to their family",
    bio: "I grew up in Moratuwa and taught Sinhala to diplomats for six years before this. Most of my students are second-generation Sri Lankans who understand more than they can say, and we start by fixing that.",
    languages: ["sinhala"],
    teaches: ["Heritage learners", "Spoken first", "Colombo Sinhala"],
  },
  {
    id: "u_arjun",
    name: "Arjun Selvarajah",
    email: "arjun@serendiblearn.com",
    homeTown: "Jaffna",
    timezone: "Asia/Colombo",
    yearsTeaching: 6,
    hourlyRateUsd: 26,
    headline: "Jaffna Tamil, spoken the way it is actually spoken",
    bio: "From Jaffna, now in Colombo. I teach spoken Tamil first and script second, because the thing you need on day one is to be understood at a bus stand.",
    languages: ["tamil"],
    teaches: ["Jaffna Tamil", "Absolute beginners", "Script when you want it"],
  },
  {
    id: "u_dilani",
    name: "Dilani Perera",
    email: "dilani@serendiblearn.com",
    homeTown: "Kandy",
    timezone: "Asia/Colombo",
    yearsTeaching: 11,
    hourlyRateUsd: 32,
    headline: "Both languages, and the history behind them",
    bio: "Eleven years of classroom teaching in Kandy. I take students who want both languages, and I refuse to teach either one without the stories that go with it.",
    languages: ["sinhala", "tamil"],
    teaches: ["Sinhala and Tamil", "Reading and writing", "Heritage and history"],
  },
];

export function getTutorProfile(id: string): TutorProfile | undefined {
  return tutorProfiles.find((tutor) => tutor.id === id);
}
