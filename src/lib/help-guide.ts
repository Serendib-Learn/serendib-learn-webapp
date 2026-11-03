import type { Role } from "@/lib/types";

/**
 * The help widget's guided answers: how to use the site, by who is asking.
 * This describes the product, not teaching content, so it lives here rather
 * than in the database. Keep it in step with the features — HANDBOOK.md
 * §2.3 (user flows) is the source; when a flow changes, change its topic.
 */

/** Who a topic is for. Signed-out people are visitors. */
export type HelpAudience = "visitor" | Role;

export interface HelpTopic {
  id: string;
  title: string;
  /** Short steps, in order. Button and page names are as they appear on screen. */
  steps: string[];
  /** Where to go to do it. */
  link?: { href: string; label: string };
  /** Extra words people might search for. */
  keywords?: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  audiences: HelpAudience[];
  topics: HelpTopic[];
}

const signedIn: HelpAudience[] = ["student", "tutor", "admin"];

export const helpCategories: HelpCategory[] = [
  // ─── Visitors ──────────────────────────────────────────────────────────
  {
    id: "about",
    title: "About Serendib Learn",
    audiences: ["visitor"],
    topics: [
      {
        id: "what-is",
        title: "What is Serendib Learn?",
        steps: [
          "Live one-to-one Sinhala and Tamil lessons with Sri Lankan tutors we have vetted personally.",
          "Lessons are on Google Meet. Between lessons you get materials, homework and a community of other learners.",
          "How it works walks through the four stages, from telling us why you're learning to practising in between.",
        ],
        link: { href: "/how-it-works", label: "How it works" },
        keywords: "about overview lessons online",
      },
      {
        id: "price",
        title: "How much does a lesson cost?",
        steps: [
          "Every lesson is LKR 5,000 for an hour, the same for every tutor.",
          "Book one at a time, or 5 or 10 together and pay once. Nothing renews.",
          "You pay by card when you book, through Payments.lk. Card details never touch our site.",
          "Not sure? Book a free intro call with our team from the pricing page.",
        ],
        link: { href: "/pricing", label: "Pricing" },
        keywords: "price cost fee money pay rupees lkr bundle package intro call",
      },
      {
        id: "browse-tutors",
        title: "See the tutors",
        steps: [
          "Open Tutors to see each tutor's photo, languages and a short bio.",
          "To book one, create an account (it's free), then book from Calendar & Bookings.",
          "A tutor marked “Ask for a lesson” isn't bookable online yet. Register your interest or ask us below.",
        ],
        link: { href: "/tutors", label: "Tutors" },
        keywords: "teacher teachers choose pick",
      },
      {
        id: "alphabet",
        title: "Learn the alphabet for free",
        steps: [
          "The Alphabet sheet has every Sinhala and Tamil letter, with audio. No account needed.",
          "Tap a letter to hear it.",
        ],
        link: { href: "/alphabet", label: "Alphabet sheet" },
        keywords: "letters script sounds pronunciation free",
      },
      {
        id: "waitlist",
        title: "Register your interest",
        steps: [
          "On the home page, fill in Register your interest: your name, email, the language and where you're starting from.",
          "We match people to tutors by hand and write to you personally, usually within a few days.",
        ],
        link: { href: "/#waitlist", label: "Register your interest" },
        keywords: "waitlist interest contact enquire",
      },
      {
        id: "policies",
        title: "Privacy, terms and refunds",
        steps: [
          "Privacy says what we keep and which outside services we use.",
          "Terms covers accounts, booking, lessons and conduct.",
          "Refunds: move or cancel up to 6 hours before and keep the lesson. Unused paid lessons can be refunded within 30 days.",
        ],
        link: { href: "/privacy", label: "Privacy policy" },
        keywords: "privacy terms conditions refund policy legal data",
      },
    ],
  },

  // ─── Accounts ──────────────────────────────────────────────────────────
  {
    id: "account",
    title: "Your account",
    audiences: ["visitor", ...signedIn],
    topics: [
      {
        id: "sign-up",
        title: "Create an account (students)",
        steps: [
          "Go to Portal → Create your account.",
          "Use any email address, choose a password, the language(s) you want and a character.",
          "Or press Continue with Google, which skips the email code.",
          "We email you a six-digit code. Enter it on the next page to finish.",
        ],
        link: { href: "/portal/signup", label: "Create your account" },
        keywords: "register signup sign up join new",
      },
      {
        id: "tutor-apply",
        title: "Apply to teach",
        steps: [
          "Sign up as a tutor with a short application: headline, bio, home town and years teaching.",
          "Confirm your email with the code we send.",
          "An admin reviews it and emails you. Once approved you're listed and can be booked.",
        ],
        link: { href: "/portal/signup?role=tutor", label: "Apply to teach" },
        keywords: "tutor teach job application become",
      },
      {
        id: "no-code",
        title: "My verification code didn't arrive",
        steps: [
          "Check your spam or junk folder. The email is from Serendib Learn.",
          "On the verify page, press Send me a new code.",
          "Still nothing? Ask us below and an admin can confirm your email for you.",
        ],
        link: { href: "/portal/verify", label: "Verify page" },
        keywords: "code email verify verification six digit spam",
      },
      {
        id: "log-in",
        title: "Log in",
        steps: [
          "Go to Portal and log in with your email and password, or Continue with Google.",
          "If it says your email isn't confirmed yet, enter the code from your email first.",
        ],
        link: { href: "/portal/login", label: "Log in" },
        keywords: "login sign in signin",
      },
      {
        id: "forgot-password",
        title: "I forgot my password",
        steps: [
          "On the login page, press Forgotten your password?",
          "Enter your email. We send a link to choose a new one, valid for 24 hours.",
        ],
        link: { href: "/portal/forgot-password", label: "Reset your password" },
        keywords: "password reset forgot forgotten change",
      },
      {
        id: "invite-link",
        title: "I was invited by email",
        steps: [
          "Open the link in the invitation and choose a password. The link works for 7 days.",
          "If it has run out, ask us below for a new one.",
        ],
        keywords: "invite invitation link expired",
      },
    ],
  },
  {
    id: "profile",
    title: "Profile and settings",
    audiences: signedIn,
    topics: [
      {
        id: "edit-profile",
        title: "Edit my profile",
        steps: [
          "Open Profile from the portal menu.",
          "Change your name, languages and character, then save.",
          "Tutors also set a headline, bio, home town, years teaching, specialties and timezone here.",
        ],
        link: { href: "/portal/profile", label: "Profile" },
        keywords: "name details settings character avatar",
      },
      {
        id: "photo",
        title: "Add a profile photo",
        steps: [
          "In Profile, press Upload a photo. It's shown instead of your character.",
          "Replace photo or Remove photo changes it later.",
        ],
        link: { href: "/portal/profile", label: "Profile" },
        keywords: "picture image photo avatar",
      },
      {
        id: "timezone",
        title: "Times look wrong",
        steps: [
          "Lesson times are shown in your device's timezone.",
          "Tutors: your weekly hours are in the timezone in your Profile. Check it's yours.",
        ],
        link: { href: "/portal/profile", label: "Profile" },
        keywords: "time zone timezone wrong hour clock",
      },
      {
        id: "log-out",
        title: "Log out",
        steps: ["Press Log out in the portal menu."],
        keywords: "logout sign out signout",
      },
    ],
  },

  // ─── Students ──────────────────────────────────────────────────────────
  {
    id: "booking",
    title: "Booking and paying",
    audiences: ["student", "admin"],
    topics: [
      {
        id: "book",
        title: "Book a lesson",
        steps: [
          "Open Calendar & Bookings. Dots show open hours, your lessons and Sri Lankan holidays.",
          "Pick a day. You can filter by tutor.",
          "On an open hour, press Book, then choose the language and what to cover.",
          "Press Continue to payment and pay by card, or Book with a free lesson if you have one.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "book booking schedule session class lesson slot",
      },
      {
        id: "bundle",
        title: "Book 5 or 10 lessons at once",
        steps: [
          "In Calendar & Bookings, choose 5 lessons or 10 lessons under How would you like to book?",
          "Pick days and press Add on open hours. Mix tutors however you like.",
          "Same time every week? Add a lesson, press Repeat weekly, then press Add on another day (say Thursday) to repeat that too. Remove a weekly time with its ×.",
          "Once all are chosen, press Continue to payment and pay once for them all.",
          "Each lesson can still be moved or cancelled up to 6 hours before, and you keep it.",
        ],
        link: { href: "/pricing", label: "Pricing" },
        keywords: "bundle package pack 5 10 lessons sessions discount plan monthly",
      },
      {
        id: "pay",
        title: "Paying for a lesson",
        steps: [
          "Checkout opens Payments.lk, where you pay LKR 5,000 by card.",
          "Back on Serendib the booking confirms and you get a receipt by email.",
          "If you leave checkout unpaid, the hour is released after 30 minutes.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "pay payment card checkout receipt failed",
      },
      {
        id: "no-slots",
        title: "I can't see any open hours",
        steps: [
          "Try another day or clear the tutor filter. Lessons need at least 2 hours' notice.",
          "Tutors publish their own hours, so a tutor may simply be full this week.",
          "Ask us below and we'll help you find a time.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "no slots availability full empty times",
      },
      {
        id: "join",
        title: "Join my lesson",
        steps: [
          "At lesson time, press Join link on the lesson in Calendar & Bookings.",
          "The Google Meet link is also in your booking email and your Google Calendar invite.",
          "We remind you by email a day and an hour before.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "join meet google meet link video call start",
      },
      {
        id: "reschedule",
        title: "Move a lesson to another time",
        steps: [
          "In Calendar & Bookings, find the lesson under your sessions and press Reschedule.",
          "Pick another of the tutor's open hours. It's free, up to 6 hours before.",
          "Your tutor is emailed and the Meet link moves too.",
          "Less than 6 hours to go? It can't be moved from the portal. If you couldn't make it, use Report missed lesson once the time has passed.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "reschedule move change time date postpone",
      },
      {
        id: "cancel",
        title: "Cancel a lesson",
        steps: [
          "In Calendar & Bookings, open the lesson and press Cancel lesson.",
          "Up to 6 hours before, you keep it as a free lesson to book again.",
          "Later than that, or a no-show, the lesson is used.",
          "If your tutor or the team cancels, you always keep it.",
        ],
        link: { href: "/refunds", label: "Cancellation policy" },
        keywords: "cancel cancellation",
      },
      {
        id: "refund",
        title: "Get a refund",
        steps: [
          "An unused paid lesson can be refunded within 30 days of paying.",
          "Ask us below, or email serendib.learn@gmail.com, and the team will arrange it.",
        ],
        link: { href: "/refunds", label: "Refund policy" },
        keywords: "refund money back",
      },
    ],
  },
  {
    id: "free-help",
    title: "Free lessons and missed lessons",
    audiences: ["student", "admin"],
    topics: [
      {
        id: "free-session",
        title: "Ask for a free session",
        steps: [
          "In Calendar & Bookings, open Free lessons & help and press Ask for a free session.",
          "Write a sentence on why. One request can wait at a time.",
          "An admin decides and you're emailed. If approved, Book with a free lesson appears on every open hour.",
        ],
        link: { href: "/portal/calendar", label: "Free lessons & help" },
        keywords: "free trial session request",
      },
      {
        id: "missed",
        title: "My lesson didn't happen",
        steps: [
          "In Calendar & Bookings, open the past lesson and press Report missed lesson (up to 30 days after).",
          "Say what happened: the tutor didn't come, technical problems, you couldn't make it, or something else.",
          "An admin looks into it. If approved you get a free lesson to book again.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "missed no show tutor absent didn't come technical problem",
      },
      {
        id: "use-free",
        title: "Use a free lesson",
        steps: [
          "When you have one, Book with a free lesson appears on every open hour and at checkout.",
          "No payment is needed.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "credit free lesson use",
      },
    ],
  },
  {
    id: "learning",
    title: "Learning between lessons",
    audiences: ["student", "admin"],
    topics: [
      {
        id: "feedback",
        title: "Send feedback, a question or a concern",
        steps: [
          "In Calendar & Bookings, use Questions or concerns? at the bottom of the page.",
          "It goes straight to the Serendib team, who read every message and reply by email.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "feedback rate rating review concern complaint question suggestion",
      },
      {
        id: "materials",
        title: "Find my materials",
        steps: [
          "Open Learning hub. Materials are filed in folders by chapter.",
          "From your tutor shows what was given to you personally. Each chapter has its phrase list too.",
        ],
        link: { href: "/portal/learning-hub", label: "Learning hub" },
        keywords: "materials worksheets vocab vocabulary audio files phrases chapter",
      },
      {
        id: "homework",
        title: "Do my homework",
        steps: [
          "Open Homework to see what your tutor has set and when it's due.",
          "Write your answer or notes and press Send to tutor.",
          "When it's marked you'll see their feedback and score there.",
        ],
        link: { href: "/portal/homework", label: "Homework" },
        keywords: "homework assignment task submit",
      },
    ],
  },
  {
    id: "community",
    title: "Community",
    audiences: ["student", "admin"],
    topics: [
      {
        id: "join-community",
        title: "Open the community",
        steps: [
          "The community opens fully after your first paid or free lesson. It's only for vetted members.",
          "Then you can read and share stories, reviews, ideas and photos.",
        ],
        link: { href: "/portal/community", label: "Community" },
        keywords: "community locked members vetted",
      },
      {
        id: "post",
        title: "Share a post",
        steps: [
          "In Community, use Share something. You can add a photo.",
          "New posts are checked by an admin before they appear.",
        ],
        link: { href: "/portal/community", label: "Community" },
        keywords: "post story share photo review",
      },
      {
        id: "partners",
        title: "Find a practice partner",
        steps: [
          "In Community, practice partners lists other vetted learners of your language.",
          "Send a friend request to connect with someone learning the same language.",
          "Don't want to be listed? Untick Show me in practice partners in Profile.",
        ],
        link: { href: "/portal/community", label: "Community" },
        keywords: "practice partner friend request learner",
      },
    ],
  },

  // ─── Tutors ────────────────────────────────────────────────────────────
  {
    id: "tutor-setup",
    title: "Tutors: getting set up",
    audiences: ["tutor", "admin"],
    topics: [
      {
        id: "tutor-approval",
        title: "When will I be approved?",
        steps: [
          "After you confirm your email, admins are told about your application.",
          "Fill in your Profile in the meantime: photo, bio, specialties.",
          "You're emailed when it's decided. Until then you're not listed or bookable.",
        ],
        link: { href: "/portal/profile", label: "Profile" },
        keywords: "approval approved pending application waiting",
      },
      {
        id: "hours",
        title: "Set my teaching hours",
        steps: [
          "Open Calendar & Bookings → My hours.",
          "Add weekly blocks, for example Monday 09:00 to 12:00, with From, Until and Add block.",
          "Students see one-hour open slots inside them. Times are in your Profile's timezone.",
        ],
        link: { href: "/portal/calendar", label: "My hours" },
        keywords: "availability hours schedule weekly open slots",
      },
      {
        id: "google-calendar",
        title: "Connect Google Calendar",
        steps: [
          "In Calendar & Bookings → My hours, press Connect Google Calendar (optional).",
          "Your bookings then appear on your own calendar with a Meet link made for you.",
          "Without it, the shared Serendib calendar makes the link, or you can paste one with Add meeting link.",
        ],
        link: { href: "/portal/calendar", label: "My hours" },
        keywords: "google calendar meet connect link",
      },
    ],
  },
  {
    id: "tutor-teaching",
    title: "Tutors: teaching",
    audiences: ["tutor", "admin"],
    topics: [
      {
        id: "new-booking",
        title: "When a student books",
        steps: [
          "You get a New booking email with the Meet link, and a Calendar invite.",
          "Reminders follow a day and an hour before. The lesson is in your Calendar & Bookings with a Join link.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "booking new student lesson email",
      },
      {
        id: "meeting-link",
        title: "Add or change a meeting link",
        steps: ["In Calendar & Bookings, open the lesson and press Add meeting link."],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "meet zoom link url",
      },
      {
        id: "tutor-reschedule",
        title: "Move or cancel a lesson",
        steps: [
          "In Calendar & Bookings, open the lesson and press Reschedule (any time before it starts). The student is emailed.",
          "Or press Cancel lesson. The student automatically gets a free lesson to rebook.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "reschedule cancel move tutor",
      },
      {
        id: "tutor-feedback",
        title: "Send the team feedback or a concern",
        steps: [
          "In Calendar & Bookings, use Questions or concerns? at the bottom of the page.",
          "It goes straight to the Serendib team, who reply by email.",
        ],
        link: { href: "/portal/calendar", label: "Calendar & Bookings" },
        keywords: "feedback concern complaint question suggestion",
      },
      {
        id: "tutor-materials",
        title: "Add and assign materials",
        steps: [
          "In Learning hub, press Add material and file it under a chapter.",
          "Use Assign material to give it to one of your students.",
          "Other tutors' materials are in Shared library.",
        ],
        link: { href: "/portal/learning-hub", label: "Learning hub" },
        keywords: "upload materials worksheet assign share library",
      },
      {
        id: "set-homework",
        title: "Set and mark homework",
        steps: [
          "Open Homework and press Set a task: pick the student, a title, the brief and a due date.",
          "When it comes back, press Mark homework, add feedback and a score.",
        ],
        link: { href: "/portal/homework", label: "Homework" },
        keywords: "homework set assign mark task",
      },
      {
        id: "content",
        title: "Improve phrase lists and alphabet sheets",
        steps: [
          "Open Content to edit the phrase lists and alphabet sheets, and mark a sheet checked.",
          "To record letters, go to Alphabet → Record pronunciations.",
        ],
        link: { href: "/portal/content", label: "Content" },
        keywords: "content phrases phrase list alphabet record audio pronunciation",
      },
    ],
  },

  // ─── Admins ────────────────────────────────────────────────────────────
  {
    id: "admin",
    title: "Admins: running the site",
    audiences: ["admin"],
    topics: [
      {
        id: "admin-daily",
        title: "What needs me today?",
        steps: [
          "The Admin badge in the menu counts what is waiting.",
          "Requests: free-session and missed-lesson requests. Approve gives a free lesson; Decline needs a note.",
          "Moderation: approve or reject community posts. Tutor applications: approve or decline.",
          "Questions: questions from this help widget. Reply and it's emailed to them.",
        ],
        link: { href: "/portal/admin", label: "Administration" },
        keywords: "admin waiting badge daily queue",
      },
      {
        id: "admin-people",
        title: "Manage people",
        steps: [
          "Admin → People: search, filter (Needs attention, Students, Tutors, Admins) and sort.",
          "Change roles and membership, Edit profile, or delete an account.",
          "Mark verified when someone's email code never arrived.",
        ],
        link: { href: "/portal/admin", label: "People" },
        keywords: "users people accounts roles verify delete",
      },
      {
        id: "admin-invite",
        title: "Invite a tutor or admin",
        steps: [
          "Admin → People → Invite someone. They get a link to set a password, valid for 7 days.",
          "You can also list a tutor without an email so they show on the Tutors page, then Add email later to invite them.",
        ],
        link: { href: "/portal/admin", label: "People" },
        keywords: "invite add tutor admin list",
      },
      {
        id: "admin-hours",
        title: "Work out tutors' pay",
        steps: [
          "Admin → Tutor hours: pick a month to see each tutor's lessons and verified hours.",
          "Download CSV to work out pay.",
        ],
        link: { href: "/portal/admin", label: "Tutor hours" },
        keywords: "pay salary hours report csv",
      },
      {
        id: "admin-refund",
        title: "Refund a lesson",
        steps: [
          "Refund the payment in the Payments.lk dashboard first.",
          "Then in Admin → Requests → Free lessons held, press Mark refunded.",
        ],
        link: { href: "/portal/admin", label: "Requests" },
        keywords: "refund payment money",
      },
      {
        id: "admin-content",
        title: "Course content and chapters",
        steps: [
          "Content: phrase lists (add and remove), alphabet sheets, holidays and course stage descriptions.",
          "Add each year's holidays once they're gazetted.",
          "Learning hub → Manage chapters: rename, reorder, add and remove chapters.",
        ],
        link: { href: "/portal/content", label: "Content" },
        keywords: "content chapters holidays stages phrase lists",
      },
      {
        id: "admin-google",
        title: "Google calendar and email",
        steps: [
          "Admin → Google: connect the shared Serendib calendar and the Gmail sender.",
          "Use Send a test email to check mail is going out.",
        ],
        link: { href: "/portal/admin?tab=google", label: "Google" },
        keywords: "google gmail email calendar connect test",
      },
      {
        id: "admin-records",
        title: "Feedback, waitlist and audit log",
        steps: [
          "Inbox: questions from the Help button, feedback from the calendar and free intro call requests. Reply by email from there.",
          "Lesson ratings: lesson ratings and write-ups from before after-lesson feedback was switched off. Feedback is only ever seen by admins.",
          "Waitlist: people who registered interest on the home page.",
          "Audit log: a record of every admin action.",
        ],
        link: { href: "/portal/admin", label: "Administration" },
        keywords: "feedback waitlist audit log history",
      },
    ],
  },
];

/** The categories someone sees. Admins see everything. */
export function categoriesFor(audience: HelpAudience): HelpCategory[] {
  if (audience === "admin") return helpCategories;
  return helpCategories.filter((category) => category.audiences.includes(audience));
}

/** Every topic someone can see whose words match the search. */
export function searchTopics(audience: HelpAudience, query: string): HelpTopic[] {
  const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 1);
  if (words.length === 0) return [];
  const seen = new Set<string>();
  const scored: { topic: HelpTopic; score: number }[] = [];
  for (const category of categoriesFor(audience)) {
    for (const topic of category.topics) {
      if (seen.has(topic.id)) continue;
      seen.add(topic.id);
      const title = topic.title.toLowerCase();
      const rest = `${topic.keywords ?? ""} ${topic.steps.join(" ")}`.toLowerCase();
      let score = 0;
      for (const word of words) {
        if (title.includes(word)) score += 3;
        else if (rest.includes(word)) score += 1;
      }
      if (score > 0) scored.push({ topic, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 8).map((item) => item.topic);
}
