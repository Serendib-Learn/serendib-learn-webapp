import { tutorProfiles } from "./tutors.ts";
import type {
  AvailabilityRule,
  Booking,
  CommunityPost,
  GameResult,
  HomeworkItem,
  LessonNote,
  MailMessage,
  Material,
  Message,
  PostReply,
  Thread,
  User,
  WaitlistEntry,
} from "./types.ts";

/** Every seeded account uses this password. Demo data only. */
export const DEMO_PASSWORD = "serendib";

export interface SeedData {
  users: User[];
  availability: AvailabilityRule[];
  bookings: Booking[];
  materials: Material[];
  homework: HomeworkItem[];
  lessonNotes: LessonNote[];
  posts: CommunityPost[];
  replies: PostReply[];
  threads: Thread[];
  messages: Message[];
  waitlist: WaitlistEntry[];
  mail: MailMessage[];
  gameResults: GameResult[];
}

/** Midnight today, so seeded lessons always sit around the current date. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function at(dayOffset: number, hour: number, minute = 0): string {
  const base = startOfToday();
  base.setDate(base.getDate() + dayOffset);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

const ADMIN = "u_admin";
const NIMALI = "u_nimali";
const ARJUN = "u_arjun";
const DILANI = "u_dilani";
const PRIYA = "u_priya";
const TOM = "u_tom";
const AISHA = "u_aisha";

function weekdayRules(
  tutorId: string,
  days: number[],
  start: string,
  end: string,
): AvailabilityRule[] {
  return days.map((weekday) => ({
    id: `av_${tutorId}_${weekday}_${start.replace(":", "")}`,
    tutorId,
    weekday,
    start,
    end,
  }));
}

export function createSeedData(): SeedData {
  const users: User[] = [
    {
      id: ADMIN,
      name: "Serendib Team",
      email: "admin@serendiblearn.com",
      role: "admin",
      verified: true,
      membership: "active",
      createdAt: at(-180, 9),
      timezone: "Asia/Colombo",
      languages: ["sinhala", "tamil"],
      headline: "Keeping the lights on",
    },
    ...tutorProfiles.map((profile, index) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: "tutor" as const,
      verified: true,
      membership: "active" as const,
      createdAt: at(-150 + index * 10, 9),
      timezone: profile.timezone,
      languages: profile.languages,
      homeTown: profile.homeTown,
      yearsTeaching: profile.yearsTeaching,
      hourlyRateUsd: profile.hourlyRateUsd,
      headline: profile.headline,
      bio: profile.bio,
    })),
    {
      id: PRIYA,
      name: "Priya Ratnam",
      email: "priya@example.com",
      role: "student",
      verified: true,
      membership: "active",
      createdAt: at(-60, 9),
      timezone: "Europe/London",
      languages: ["tamil"],
      homeTown: "London",
      headline: "Learning Tamil before the next family wedding",
    },
    {
      id: TOM,
      name: "Tom Whitfield",
      email: "tom@example.com",
      role: "student",
      verified: true,
      membership: "active",
      createdAt: at(-40, 9),
      timezone: "Australia/Melbourne",
      languages: ["sinhala"],
      homeTown: "Melbourne",
      headline: "Moving to Colombo in March",
    },
    {
      id: AISHA,
      name: "Aisha Rahman",
      email: "aisha@example.com",
      role: "student",
      verified: true,
      membership: "none",
      createdAt: at(-6, 9),
      timezone: "America/Toronto",
      languages: ["sinhala"],
      homeTown: "Toronto",
      headline: "Just signed up, no lessons booked yet",
    },
  ];

  return {
    users,
    availability: [
      ...weekdayRules(NIMALI, [1, 2, 3, 4], "09:00", "12:00"),
      ...weekdayRules(NIMALI, [2, 4], "17:00", "20:00"),
      ...weekdayRules(ARJUN, [1, 3, 5], "07:00", "10:00"),
      ...weekdayRules(ARJUN, [6], "09:00", "13:00"),
      ...weekdayRules(DILANI, [1, 2, 3, 4, 5], "14:00", "18:00"),
      ...weekdayRules(DILANI, [0], "10:00", "12:00"),
    ],
    bookings: [
      {
        id: "bk_1",
        tutorId: ARJUN,
        studentId: PRIYA,
        startsAt: at(-14, 18),
        durationMins: 60,
        language: "tamil",
        focus: "Greetings and family words",
        status: "completed",
        priceUsd: 26,
        createdAt: at(-20, 11),
        paidAt: at(-20, 11),
      },
      {
        id: "bk_2",
        tutorId: ARJUN,
        studentId: PRIYA,
        startsAt: at(-7, 18),
        durationMins: 60,
        language: "tamil",
        focus: "Ordering food, and asking for less chilli",
        status: "completed",
        priceUsd: 26,
        createdAt: at(-13, 11),
        paidAt: at(-13, 11),
      },
      {
        id: "bk_3",
        tutorId: ARJUN,
        studentId: PRIYA,
        startsAt: at(2, 18),
        durationMins: 60,
        language: "tamil",
        focus: "Talking to relatives on the phone",
        status: "confirmed",
        priceUsd: 26,
        createdAt: at(-4, 9),
        paidAt: at(-4, 9),
        meetingUrl: "https://meet.serendiblearn.com/priya-arjun",
      },
      {
        id: "bk_4",
        tutorId: NIMALI,
        studentId: TOM,
        startsAt: at(-3, 10),
        durationMins: 60,
        language: "sinhala",
        focus: "Tuk tuk negotiation and directions",
        status: "completed",
        priceUsd: 28,
        createdAt: at(-10, 15),
        paidAt: at(-10, 15),
      },
      {
        id: "bk_5",
        tutorId: NIMALI,
        studentId: TOM,
        startsAt: at(1, 10),
        durationMins: 90,
        language: "sinhala",
        focus: "Renting a flat in Colombo",
        status: "confirmed",
        priceUsd: 42,
        createdAt: at(-2, 8),
        paidAt: at(-2, 8),
        meetingUrl: "https://meet.serendiblearn.com/tom-nimali",
      },
      {
        id: "bk_6",
        tutorId: DILANI,
        studentId: TOM,
        startsAt: at(4, 15),
        durationMins: 60,
        language: "sinhala",
        focus: "Reading the Sinhala alphabet",
        status: "awaiting_payment",
        priceUsd: 32,
        createdAt: at(0, 9),
      },
    ],
    materials: [
      {
        id: "mat_1",
        ownerId: ARJUN,
        title: "Tamil script — the first twelve letters",
        description:
          "A worksheet for the vowels, with tracing guides and the sound each one makes in isolation.",
        kind: "pdf",
        language: "tamil",
        level: "beginner",
        assignedTo: [PRIYA],
        fileLabel: "tamil-vowels.pdf · 1.2 MB",
        createdAt: at(-18, 12),
      },
      {
        id: "mat_2",
        ownerId: ARJUN,
        title: "Family words, recorded slowly",
        description:
          "Me reading the Chapter 8 relative words at half speed, then at normal speed. Listen twice before our next session.",
        kind: "audio",
        language: "tamil",
        level: "beginner",
        assignedTo: [PRIYA],
        fileLabel: "family-words.mp3 · 4:12",
        createdAt: at(-9, 12),
      },
      {
        id: "mat_3",
        ownerId: NIMALI,
        title: "Tuk tuk role play script",
        description:
          "Two-column script. Cover the right side and try to produce the Sinhala from the English prompts.",
        kind: "pdf",
        language: "sinhala",
        level: "beginner",
        assignedTo: [TOM],
        fileLabel: "tuk-tuk-roleplay.pdf · 380 KB",
        createdAt: at(-11, 16),
      },
      {
        id: "mat_4",
        ownerId: NIMALI,
        title: "Numbers 1 to 100 in Sinhala",
        description: "Video walkthrough, with the pattern that makes the twenties onward easy.",
        kind: "video",
        language: "sinhala",
        level: "beginner",
        assignedTo: [TOM],
        fileLabel: "18 min",
        createdAt: at(-5, 16),
      },
      {
        id: "mat_5",
        ownerId: ADMIN,
        title: "Survival Sri Lanka — printable phrase cards",
        description:
          "All 63 phrases from Phase 1, laid out eight to a page for cutting up. Sinhala and Tamil on the same card.",
        kind: "deck",
        language: "both",
        level: "beginner",
        assignedTo: [],
        fileLabel: "survival-cards.pdf · 2.4 MB",
        createdAt: at(-30, 10),
      },
      {
        id: "mat_6",
        ownerId: ADMIN,
        title: "How Sinhala and Tamil word order works",
        description:
          "A short read on why both languages put the verb last, and why that is good news for you.",
        kind: "link",
        language: "both",
        level: "beginner",
        assignedTo: [],
        url: "https://www.serendiblearn.com/learning-hub/word-order",
        createdAt: at(-25, 10),
      },
    ],
    homework: [
      {
        id: "hw_1",
        studentId: PRIYA,
        tutorId: ARJUN,
        title: "Record yourself saying the six family words",
        brief:
          "Voice note, one take, no script in front of you. I want to hear where you hesitate.",
        dueAt: at(-8, 20),
        status: "reviewed",
        createdAt: at(-14, 19),
        submittedAt: at(-9, 21),
        submissionNote: "Recorded twice, sent the second one. Paatti was hardest.",
        feedback:
          "Much better than last week. Paatti needs a harder t — put your tongue further forward. Annan was perfect.",
        score: 82,
      },
      {
        id: "hw_2",
        studentId: PRIYA,
        tutorId: ARJUN,
        title: "Order a meal for three people, in writing",
        brief:
          "Use Chapter 5. One of the three cannot eat chilli, so you will need that phrase too.",
        dueAt: at(1, 20),
        status: "submitted",
        createdAt: at(-6, 19),
        submittedAt: at(-1, 22),
        submissionNote: "Attached below. Not sure about the plural on kariyum.",
      },
      {
        id: "hw_3",
        studentId: TOM,
        tutorId: NIMALI,
        title: "Write out the tuk tuk conversation from memory",
        brief:
          "Both sides of it. Then mark the three places you had to guess, and we will start there.",
        dueAt: at(3, 20),
        status: "assigned",
        createdAt: at(-2, 11),
      },
      {
        id: "hw_4",
        studentId: TOM,
        tutorId: NIMALI,
        title: "Count to fifty out loud, three times",
        brief: "Once slowly, once at normal speed, once as fast as you can without errors.",
        dueAt: at(-1, 20),
        status: "reviewed",
        createdAt: at(-5, 11),
        submittedAt: at(-2, 19),
        submissionNote: "Fell apart around thirty-seven.",
        feedback:
          "Thirty-seven is where everyone falls apart. The pattern from thirty on is regular — once you trust it the rest is free.",
        score: 74,
      },
    ],
    lessonNotes: [
      {
        id: "ln_1",
        bookingId: "bk_1",
        studentId: PRIYA,
        tutorId: ARJUN,
        date: at(-14, 18),
        summary:
          "Covered greetings and the six relative words. Priya can already hear the difference between the retroflex and dental t, which is most of the battle.",
        wentWell: "Listening. Understood nearly everything I said at normal speed.",
        workOn: "Producing the retroflex t. Confidence — she knows more than she thinks.",
        vocabIntroduced: ["Vanakkam", "Nandri", "Paatti", "Thaatha", "Annan", "Akka"],
      },
      {
        id: "ln_2",
        bookingId: "bk_2",
        studentId: PRIYA,
        tutorId: ARJUN,
        date: at(-7, 18),
        summary:
          "Restaurant role play, twice through, second time without notes. Introduced the chilli phrases, which she will need more than anything else on this list.",
        wentWell: "Held a full ordering exchange with no English.",
        workOn: "Numbers above twenty. Asking for the bill without switching to English.",
        vocabIntroduced: ["Aappam kodunga", "Milagai vendaam", "Bill kodunga", "Ruchi"],
      },
      {
        id: "ln_3",
        bookingId: "bk_4",
        studentId: TOM,
        tutorId: NIMALI,
        date: at(-3, 10),
        summary:
          "Tuk tuk chapter, start to finish. Tom negotiated a fare down in Sinhala without prompting, which is a first.",
        wentWell: "Kiiyada and hari gaanai came out naturally.",
        workOn: "Left and right under pressure. He reverses them when he is rushed.",
        vocabIntroduced: ["Kiiyada", "Hari gaanai", "Wamata harenna", "Dakunata harenna"],
      },
    ],
    posts: [
      {
        id: "po_1",
        authorId: PRIYA,
        title: "Six weeks in and my grandmother laughed at me (in a good way)",
        body: "I called Paatti on Sunday and got through about ninety seconds before switching to English. She laughed at my accent for a solid minute and then repeated everything back to me slowly. Best lesson I have had.\n\nIf you are second-generation and putting this off because you are embarrassed — the embarrassment is the whole thing. Get it over with early.",
        tags: ["milestone", "family"],
        status: "approved",
        createdAt: at(-5, 20),
        likedBy: [TOM, ARJUN, DILANI],
      },
      {
        id: "po_2",
        authorId: TOM,
        title: "Moving to Colombo in March — what should I learn first?",
        body: "I have the tuk tuk chapter down and I can order food. Landlord conversations are next and I have no idea where to start. Anyone done this? Which fifty words actually matter in the first month?",
        tags: ["moving", "question"],
        status: "approved",
        createdAt: at(-3, 8),
        likedBy: [PRIYA],
      },
      {
        id: "po_3",
        authorId: DILANI,
        title: "Why I teach the Kandy Perahera before the past tense",
        body: "Students ask me why we spend a session on a festival when they came here for grammar. Because language that is not attached to anything falls straight out of your head.\n\nLearn the Perahera and you have the words for drum, elephant, crowd, procession, night, and the reason any of it is happening. Learn the past tense on its own and you have a table.",
        tags: ["teaching", "heritage"],
        status: "approved",
        createdAt: at(-9, 12),
        likedBy: [PRIYA, TOM, NIMALI],
      },
      {
        id: "po_4",
        authorId: TOM,
        title: "Cheap flights to CMB — link inside",
        body: "Found a site with really good deals on flights to Colombo, thought people here might want it. Sign up with my referral link and we both get a discount.",
        tags: ["travel"],
        status: "pending",
        createdAt: at(0, 7),
        likedBy: [],
      },
    ],
    replies: [
      {
        id: "rp_1",
        postId: "po_2",
        authorId: NIMALI,
        body: "Numbers, dates and the words for month, deposit and water bill. Landlord conversations are ninety percent numbers. We can do a session on exactly this.",
        createdAt: at(-3, 10),
      },
      {
        id: "rp_2",
        postId: "po_2",
        authorId: PRIYA,
        body: "Also learn how to say you will call back later. Buys you time to look things up.",
        createdAt: at(-2, 19),
      },
      {
        id: "rp_3",
        postId: "po_1",
        authorId: DILANI,
        body: "This is the whole thing. Being laughed at kindly by a relative is the fastest teaching method ever invented.",
        createdAt: at(-4, 9),
      },
    ],
    threads: [
      { id: "th_1", participantIds: [PRIYA, ARJUN], createdAt: at(-20, 11) },
      { id: "th_2", participantIds: [TOM, NIMALI], createdAt: at(-10, 15) },
    ],
    messages: [
      {
        id: "ms_1",
        threadId: "th_1",
        senderId: PRIYA,
        body: "Hi Arjun — sent the voice note for the family words homework. Paatti nearly broke me.",
        sentAt: at(-9, 21),
        readBy: [PRIYA, ARJUN],
      },
      {
        id: "ms_2",
        threadId: "th_1",
        senderId: ARJUN,
        body: "Listened to it. Genuinely good. The t is the only thing standing between you and sounding like you grew up there.",
        sentAt: at(-9, 22),
        readBy: [PRIYA, ARJUN],
      },
      {
        id: "ms_3",
        threadId: "th_1",
        senderId: ARJUN,
        body: "For Thursday, can you look at the phone call chapter before we meet? I want to spend the hour talking, not reading.",
        sentAt: at(-1, 17),
        readBy: [ARJUN],
      },
      {
        id: "ms_4",
        threadId: "th_2",
        senderId: NIMALI,
        body: "Tom — I have added the numbers video to your learning hub. Watch it before the flat-hunting session, it will save us twenty minutes.",
        sentAt: at(-5, 16),
        readBy: [NIMALI, TOM],
      },
      {
        id: "ms_5",
        threadId: "th_2",
        senderId: TOM,
        body: "Watched it twice. Thirty onwards finally makes sense.",
        sentAt: at(-4, 9),
        readBy: [NIMALI, TOM],
      },
    ],
    waitlist: [
      {
        id: "wl_1",
        name: "Rukshan de Silva",
        email: "rukshan@example.com",
        language: "sinhala",
        level: "rusty",
        reason:
          "Spoke it until I was six and lost it. Parents are getting older and I would like to fix this while it still matters.",
        createdAt: at(-8, 22),
      },
      {
        id: "wl_2",
        name: "Hannah Beck",
        email: "hannah@example.com",
        language: "either",
        level: "none",
        reason: "Doing a six month posting in Trincomalee and would rather not be useless.",
        createdAt: at(-2, 13),
      },
    ],
    mail: [
      {
        id: "mail_seed_1",
        to: "priya@example.com",
        subject: "Your session with Arjun is confirmed",
        body: "Thursday at 6:00pm your time. Focus: talking to relatives on the phone. Your meeting link is in the portal.",
        kind: "notification",
        sentAt: at(-4, 9),
        read: true,
      },
    ],
    gameResults: [
      {
        id: "gr_1",
        userId: PRIYA,
        chapterId: "meeting-relatives",
        script: "tamil",
        correct: 6,
        total: 6,
        completedAt: at(-10, 21),
      },
      {
        id: "gr_2",
        userId: PRIYA,
        chapterId: "ordering-food",
        script: "tamil",
        correct: 6,
        total: 8,
        completedAt: at(-6, 21),
      },
      {
        id: "gr_3",
        userId: TOM,
        chapterId: "tuk-tuk-adventure",
        script: "sinhala",
        correct: 9,
        total: 10,
        completedAt: at(-3, 12),
      },
    ],
  };
}

export const demoAccounts = [
  { email: "priya@example.com", role: "Student", note: "Two tutors, homework, active member" },
  { email: "nimali@serendiblearn.com", role: "Tutor", note: "Sinhala, with tutees and materials" },
  { email: "admin@serendiblearn.com", role: "Super admin", note: "Full site administration" },
];
