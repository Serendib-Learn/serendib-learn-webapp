/**
 * Domain types used by both the Next.js app and the API service in `server/`.
 * This is the contract between them: change it here and both sides see it.
 */

export type Role = "student" | "tutor" | "admin";

export type LanguageCode = "sinhala" | "tamil";

export type MembershipStatus = "none" | "active";

/**
 * Where a tutor's application stands. Only `approved` tutors can be found and
 * booked; a tutor record with no status at all predates approvals and counts
 * as approved.
 */
export type TutorStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  /**
   * Empty for a tutor an administrator listed before having their address
   * (`InviteInput.email` left out). Such an account cannot sign in or be
   * booked until an administrator adds the address, which sends the invite.
   */
  email: string;
  role: Role;
  verified: boolean;
  membership: MembershipStatus;
  createdAt: string;
  timezone: string;
  languages: LanguageCode[];
  headline?: string;
  bio?: string;
  hourlyRateUsd?: number;
  yearsTeaching?: number;
  homeTown?: string;
  /** Tutors: short tags for what they are best at, shown on their public profile. */
  specialties?: string[];
  /** Tutors only — see `TutorStatus`. */
  tutorStatus?: TutorStatus;
  /**
   * The site owners' own account. A super admin cannot be demoted or deleted
   * from the admin area, so one admin cannot lock the owners out.
   */
  superAdmin?: boolean;
  /** Google's stable subject id, set once an account has been linked. */
  googleId?: string;
  /** Profile picture from Google, when there is one. */
  avatarUrl?: string;
  /** A character from shared/avatars.ts chosen to represent them. */
  avatarId?: string;
  /**
   * Set when they have uploaded a photo, served from
   * /api/profile-photos/:userId?v=<photoId>. Changes with every upload, so it
   * versions the URL (and caches can keep each version for a year). A tutor's
   * photo is public; anyone else's is served only with the current version,
   * which only signed-in members are ever sent.
   */
  photoId?: string;
  /**
   * Whether they appear in the community's practice partners directory.
   * Missing means yes — vetted members are listed unless they opt out.
   */
  openToPractice?: boolean;
}

/**
 * What any signed-in member may see about another member. Names are needed all
 * over the portal — on bookings, posts and replies — but contact details are
 * not, so the API only ever sends this much.
 */
export interface PublicProfile {
  id: string;
  name: string;
  role: Role;
  headline?: string;
  avatarId?: string;
  /** Their uploaded photo's version, when they have one (see `User.photoId`). */
  photoId?: string;
  /** Only sent where it helps — in a conversation, to know when to expect a reply. */
  timezone?: string;
}

/**
 * A tutor as the public sees them — on the tutors page and in the booking
 * flow. No email address, Google id or account flags.
 */
export type PublicTutor = Pick<
  User,
  | "id"
  | "name"
  | "role"
  | "timezone"
  | "languages"
  | "headline"
  | "bio"
  | "hourlyRateUsd"
  | "yearsTeaching"
  | "homeTown"
  | "specialties"
  | "avatarUrl"
  | "avatarId"
  | "photoId"
  | "createdAt"
> & {
  /** False while the tutor has no email address on file: listed, but not yet bookable. */
  bookable: boolean;
};

export interface AvailabilityRule {
  id: string;
  tutorId: string;
  /** 0 = Sunday through 6 = Saturday. */
  weekday: number;
  /** Local wall-clock time, "HH:mm". */
  start: string;
  end: string;
}

export interface Slot {
  tutorId: string;
  startsAt: string;
  durationMins: number;
}

export type BookingStatus =
  | "awaiting_payment"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  tutorId: string;
  studentId: string;
  startsAt: string;
  durationMins: number;
  language: LanguageCode;
  focus: string;
  status: BookingStatus;
  priceUsd: number;
  createdAt: string;
  paidAt?: string;
  meetingUrl?: string;
  /** Id of the Google Calendar event backing this booking, when there is one. */
  googleEventId?: string;
  /**
   * Whose calendar that event is on: the tutor's own, or the site's shared
   * Serendib calendar (used when the tutor has not connected one). Missing
   * means the tutor's, which is all there was before the shared one existed.
   */
  googleCalendarOwner?: "tutor" | "system";
  /** The card payment, when it went through Payments.lk rather than the demo checkout. */
  payment?: BookingPayment;
  /** The lesson credit it was booked with, instead of a payment. */
  creditId?: string;
  /** Every move to a new time, oldest first. Rescheduling never changes the price. */
  reschedules?: BookingReschedule[];
  /** Why a booking was cancelled, when the system did it (an expired checkout, say). */
  cancelReason?: string;
  /** When each before-the-lesson reminder went out (a day ahead, an hour ahead). */
  lessonReminders?: {
    day?: string;
    hour?: string;
  };
  /** When each feedback reminder went out, so none is sent twice. */
  feedbackReminders?: {
    student?: string[];
    tutor?: string[];
  };
}

/** One move of a booking to a new time. */
export interface BookingReschedule {
  from: string;
  to: string;
  /** Who moved it: the student, the tutor or an administrator. */
  byId: string;
  at: string;
}

/**
 * Why a student holds a free lesson: an approved request, or a paid lesson
 * the tutor (or the team) cancelled.
 */
export type CreditReason = "free_session" | "missed_session" | "tutor_cancelled";

/**
 * One free lesson a student can book instead of paying. Used once; given
 * back if the lesson booked with it is cancelled.
 */
export interface LessonCredit {
  id: string;
  studentId: string;
  reason: CreditReason;
  /** The longest lesson it covers. */
  durationMins: number;
  /** The request it came from, when it came from one. */
  requestId?: string;
  /** The cancelled booking it replaces, for a tutor_cancelled credit. */
  sourceBookingId?: string;
  grantedById: string;
  createdAt: string;
  usedBookingId?: string;
  usedAt?: string;
}

export type StudentRequestKind = "free_session" | "missed_session";
export type StudentRequestStatus = "pending" | "approved" | "declined";

/** What happened to a missed lesson, as the student tells it. */
export type MissedCause = "tutor_absent" | "technical" | "student_unable" | "other";

/**
 * A student asking the team for something only an administrator can grant:
 * a free session, or help with a lesson that was missed. Approving one
 * grants a `LessonCredit`.
 */
export interface StudentRequest {
  id: string;
  kind: StudentRequestKind;
  studentId: string;
  /** The missed lesson, for a missed_session request. */
  bookingId?: string;
  cause?: MissedCause;
  reason: string;
  status: StudentRequestStatus;
  createdAt: string;
  decidedById?: string;
  decidedAt?: string;
  /** The administrator's note to the student, sent with the decision. */
  decisionNote?: string;
  creditId?: string;
}

export interface StudentRequestInput {
  kind: StudentRequestKind;
  reason: string;
  bookingId?: string;
  cause?: MissedCause;
}

/**
 * How a lesson was paid for: by card through Payments.lk, with a free
 * lesson, recorded as paid by an administrator (or the demo checkout), or
 * not at all.
 */
export type LessonPaidWith = "card" | "free_lesson" | "recorded" | "unpaid";

/** One lesson in the tutor hours report — administrators only. */
export interface TutorHoursLesson {
  bookingId: string;
  studentId: string;
  startsAt: string;
  durationMins: number;
  language: LanguageCode;
  focus: string;
  /** Taught (its end has passed), still to come, or cancelled after it was paid for. */
  state: "taught" | "upcoming" | "cancelled";
  paidWith: LessonPaidWith;
  /** What the card was charged, in LKR cents. */
  amountCents?: number;
  /** A Payments.lk sandbox payment: no real money moved. */
  testPayment?: boolean;
  /** The tutor has written the lesson up. */
  writtenUp: boolean;
  /** The student's rating, 1 to 5, once they have given feedback. */
  rating?: number;
  /**
   * A missed-lesson report against it that is waiting or was approved —
   * except "I could not make it", which says nothing about the tutor.
   */
  dispute?: { status: StudentRequestStatus; cause?: MissedCause };
  /** Taught, written up and not reported missed: counts towards the tutor's pay. */
  verified: boolean;
  cancelReason?: string;
}

/** One tutor's lessons over the report's period. Minutes are lesson lengths. */
export interface TutorHoursSummary {
  tutorId: string;
  tutorName: string;
  taughtLessons: number;
  taughtMinutes: number;
  verifiedMinutes: number;
  /** Taught, but the tutor has not written them up yet. */
  awaitingWriteUp: number;
  disputed: number;
  upcomingLessons: number;
  upcomingMinutes: number;
  cancelledLessons: number;
  /** Card payments for the lessons taught or to come, in LKR cents. */
  cardCents: number;
  /** Lessons taught or to come that were booked with a free lesson. */
  freeLessons: number;
  averageRating?: number;
  ratings: number;
  lessons: TutorHoursLesson[];
}

/** GET /api/reports/tutor-hours: every tutor's lessons between two instants. */
export interface TutorHoursReport {
  from: string;
  to: string;
  generatedAt: string;
  tutors: TutorHoursSummary[];
}

/**
 * A booking's hosted checkout on Payments.lk. Amounts are in LKR cents:
 * Payments.lk only takes rupees, so the USD price is converted when the
 * checkout is made, at the rate in the API's USD_TO_LKR setting.
 */
export interface BookingPayment {
  provider: "payments.lk";
  mode: "test" | "live";
  checkoutId: string;
  checkoutUrl: string;
  expiresAt: string;
  amountCents: number;
  currency: "LKR";
  paymentId?: string;
  /** e.g. "VISA •••• 4242", once paid. */
  card?: string;
  /** The processor's reason, when an attempt was declined. */
  failureMessage?: string;
}

/** What the frontend needs to know about taking payments. */
export interface PaymentsConfig {
  /** False when no Payments.lk key is set: the demo checkout is used instead. */
  enabled: boolean;
  mode: "test" | "live" | null;
  /** Rupees per US dollar used to price checkouts. */
  usdToLkr: number;
}

export type MaterialKind = "pdf" | "audio" | "video" | "link" | "deck";

export interface Material {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  kind: MaterialKind;
  language: LanguageCode | "both";
  level: "beginner" | "intermediate" | "advanced";
  /** Student ids this material has been assigned to. Empty means unassigned. */
  assignedTo: string[];
  fileLabel?: string;
  url?: string;
  /** The course chapter it belongs to. Missing means unfiled. */
  chapterId?: string;
  createdAt: string;
}

/** One chapter of the course; materials are filed under these. */
export interface CourseChapter {
  id: string;
  /** The heading chapters are grouped under, e.g. "Foundation". */
  stage: string;
  title: string;
  summary: string;
  /** Sort key across all chapters; stages appear in the order of their first chapter. */
  order: number;
  /** A Survival Sri Lanka phrase list (src/data/vocabulary.ts) to show with it. */
  vocabChapterId?: string;
  createdAt: string;
}

export type HomeworkStatus = "assigned" | "submitted" | "reviewed";

export interface HomeworkItem {
  id: string;
  studentId: string;
  tutorId: string;
  title: string;
  brief: string;
  dueAt: string;
  status: HomeworkStatus;
  createdAt: string;
  submittedAt?: string;
  submissionNote?: string;
  feedback?: string;
  score?: number;
}

export interface LessonNote {
  id: string;
  bookingId: string;
  studentId: string;
  tutorId: string;
  date: string;
  summary: string;
  wentWell: string;
  workOn: string;
  vocabIntroduced: string[];
  /** A spoken version of the write-up, when the tutor recorded one. */
  voiceNoteId?: string;
  /** Where the student stands after this lesson. Shown to the student. */
  progress?: ProgressMark;
  /**
   * How engaged and prepared the student was, 1 to 5. For the tutor and the
   * team only — the API leaves it out of what students are sent.
   */
  engagement?: number;
  /** Materials used or recommended in the lesson; they land in the student's learning hub. */
  materialIds?: string[];
  createdAt?: string;
}

/** A tutor's read on a student after a lesson. */
export type ProgressMark = "needs_support" | "on_track" | "ahead";

/** How a lesson's pace felt to the student. */
export type LessonPace = "too_slow" | "just_right" | "too_fast";

/** A student's verdict on one lesson, given after it ends. */
export interface SessionFeedback {
  id: string;
  bookingId: string;
  studentId: string;
  tutorId: string;
  /** 1 to 5. */
  rating: number;
  comment: string;
  voiceNoteId?: string;
  pace?: LessonPace;
  /** How helpful the lesson's materials were, 1 to 5, when there were any. */
  materialsRating?: number;
  /** What the student wants to work on next time. */
  nextFocus?: string;
  createdAt: string;
}

/** How a material's level suited a student. */
export type MaterialLevelFit = "too_easy" | "just_right" | "too_hard";

/**
 * One person's feedback on a material — different questions for a student
 * (was it helpful, was the level right) and a tutor (how does it work in a
 * lesson, what would make it better). One per person per material.
 */
export interface MaterialFeedback {
  id: string;
  materialId: string;
  authorId: string;
  authorRole: "student" | "tutor";
  /** Students: how helpful it was. Tutors: how well it works in lessons. 1 to 5. */
  rating: number;
  /** Students only. */
  level?: MaterialLevelFit;
  /** Tutors only: what would make it better. */
  suggestion?: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialFeedbackInput {
  rating: number;
  level?: MaterialLevelFit;
  suggestion?: string;
  comment?: string;
}

/** What a material's owner sees at a glance. */
export interface MaterialFeedbackSummary {
  materialId: string;
  count: number;
  average: number;
}

/** A recorded voice note's details. The audio itself is fetched separately. */
export interface VoiceNoteInfo {
  id: string;
  ownerId: string;
  bookingId: string;
  mimeType: string;
  durationSec: number;
  createdAt: string;
}

/**
 * A finished lesson still waiting on this person's part of the feedback loop:
 * a rating from the student, a write-up from the tutor.
 */
export interface PendingFeedback {
  booking: Booking;
  /** The other person on the lesson. */
  other: PublicProfile;
  /** What is owed: the student's feedback, or the tutor's write-up. */
  kind: "feedback" | "write-up";
}

export interface LessonNoteInput {
  bookingId: string;
  summary: string;
  wentWell: string;
  workOn: string;
  vocabIntroduced: string[];
  voiceNoteId?: string;
  progress?: ProgressMark;
  engagement?: number;
  materialIds?: string[];
}

export interface SessionFeedbackInput {
  bookingId: string;
  rating: number;
  comment: string;
  voiceNoteId?: string;
  pace?: LessonPace;
  materialsRating?: number;
  nextFocus?: string;
}

export type PostStatus = "pending" | "approved" | "rejected";

/** What a community post is, as on the original site's community page. */
export type PostKind = "story" | "review" | "idea" | "photo";

export interface CommunityPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  status: PostStatus;
  createdAt: string;
  likedBy: string[];
  moderationNote?: string;
  /** Missing on posts from before kinds existed; treat as a story. */
  kind?: PostKind;
  /** An uploaded photo, served from /post-images/:id. */
  imageId?: string;
}

export interface PostReply {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  participantIds: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  sentAt: string;
  readBy: string[];
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  language: LanguageCode | "either";
  level: "none" | "some" | "rusty" | "fluent-ish";
  reason: string;
  createdAt: string;
}

export type MailKind =
  | "verification"
  | "password_reset"
  | "welcome"
  | "receipt"
  | "notification";

export interface MailMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  kind: MailKind;
  sentAt: string;
  read: boolean;
  /** Six digit code for verification mail. */
  code?: string;
  /** Single-use token for password reset mail. */
  token?: string;
}

export interface GameResult {
  id: string;
  userId: string;
  chapterId: string;
  script: LanguageCode;
  correct: number;
  total: number;
  completedAt: string;
}

/** What someone applying to teach tells us up front. All optional at signup. */
export interface TutorApplication {
  headline?: string;
  bio?: string;
  homeTown?: string;
  yearsTeaching?: number;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, "admin">;
  languages: LanguageCode[];
  timezone: string;
  /** Only read when `role` is `tutor`. */
  application?: TutorApplication;
  /** A character from shared/avatars.ts. */
  avatarId?: string;
  /** Cloudflare Turnstile token. Required only when the server has CAPTCHA configured. */
  turnstileToken?: string;
}

/**
 * An administrator creating someone's account for them — an existing tutor
 * being brought onto the site, or another administrator. The person gets an
 * email with a link to choose their own password.
 */
export interface InviteInput {
  name: string;
  /**
   * Required, except for a tutor: leaving it out lists the tutor publicly
   * with their profile, without an account they can sign in to yet. Adding
   * the address later (`POST /users/:id/email`) sends the invite.
   */
  email?: string;
  role: Role;
  languages: LanguageCode[];
  timezone?: string;
}

export interface GoogleSignInInput {
  /** The ID token from Google Identity Services. */
  credential: string;
  /**
   * `login` refuses to create anything, so an unknown account can be sent to
   * signup to choose a role first. `signup` carries those answers with it.
   */
  intent: "login" | "signup";
  role?: Exclude<Role, "admin">;
  languages?: LanguageCode[];
  timezone?: string;
  avatarId?: string;
}

export interface BookingInput {
  tutorId: string;
  studentId: string;
  startsAt: string;
  durationMins: number;
  language: LanguageCode;
  focus: string;
}

export interface MaterialInput {
  ownerId: string;
  title: string;
  description: string;
  kind: MaterialKind;
  language: LanguageCode | "both";
  level: Material["level"];
  fileLabel?: string;
  url?: string;
  assignedTo: string[];
  chapterId?: string;
}

export interface HomeworkInput {
  studentId: string;
  tutorId: string;
  title: string;
  brief: string;
  dueAt: string;
}

export interface CommunityPostInput {
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  kind?: PostKind;
  imageId?: string;
}

/** A conversation with the other participant and unread count folded in. */
export interface ThreadSummary {
  thread: Thread;
  /** Profile only — the other person's email address stays private. */
  other: PublicProfile;
  lastMessage?: Message;
  unread: number;
}

export type ConnectionStatus = "pending" | "accepted" | "declined";

/** A friend request between two community members, and what became of it. */
export interface Connection {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: ConnectionStatus;
  createdAt: string;
  respondedAt?: string;
}

/** Someone in the practice partners directory, as another member sees them. */
export interface CommunityMember {
  id: string;
  name: string;
  role: Role;
  avatarId?: string;
  photoId?: string;
  languages: LanguageCode[];
  headline?: string;
  homeTown?: string;
  /** How this member and the viewer are connected, if at all. */
  connection?: {
    id: string;
    status: ConnectionStatus;
    /** Who asked: the viewer ("outgoing") or this member ("incoming"). */
    direction: "outgoing" | "incoming";
  };
}

/** A record of an administrator doing something to someone else's account or content. */
export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetLabel: string;
  detail?: string;
  createdAt: string;
}

/** Whether the current user has linked a Google account for Calendar + Meet. */
export interface GoogleCalendarStatus {
  connected: boolean;
  email?: string;
}

/** What a tutor sees about one of their students. */
export interface StudentProgress {
  student: User;
  lessonsCompleted: number;
  upcomingLessons: number;
  homeworkOutstanding: number;
  averageScore?: number;
  lastLessonAt?: string;
  chaptersPractised: number;
}

/*
 * Teaching content. All of it lives in the database and is read through
 * /api/content/:kind — nothing in the site hard-codes it. A fresh database is
 * filled once from server/src/seed/; after that the content editor
 * (/portal/content) is the way to change it.
 */

/** One phrase in a phrase list, in English and both scripts. */
export interface Phrase {
  /** Position in the list, from 1. */
  n: number;
  english: string;
  sinhala: string;
  sinhalaRoman: string;
  tamil: string;
  tamilRoman: string;
  note?: string;
}

/** A themed list of phrases (Survival Sri Lanka's "Arriving", say). Course chapters link to one. */
export interface PhraseList {
  /** A readable slug, e.g. "tuk-tuk-adventure". */
  id: string;
  /** Order within its stage. */
  number: number;
  emoji: string;
  title: string;
  /** The situation the phrases are for. */
  scene: string;
  /** The course stage it belongs to, e.g. "Survival Sri Lanka". */
  stage: string;
  phrases: Phrase[];
  updatedAt: string;
  updatedById?: string;
}

export interface AlphabetLetter {
  letter: string;
  roman: string;
  /** Plain-English guide to the sound. */
  sound: string;
  ipa: string;
  example?: { word: string; roman: string; meaning: string };
}

export interface AlphabetLetterGroup {
  title: string;
  /** The group's name in the script itself, and romanised. */
  native?: string;
  intro: string;
  letters: AlphabetLetter[];
}

export interface AlphabetVowelSign {
  /** The consonant with the sign attached. */
  form: string;
  roman: string;
}

/** One language's alphabet sheet, as /alphabet shows it. */
export interface AlphabetSheet {
  /** The language, which is also the sheet's id. */
  id: LanguageCode;
  name: string;
  native: string;
  intro: string;
  groups: AlphabetLetterGroup[];
  /** How each vowel looks once it is attached to a consonant. */
  vowelSigns: { base: string; intro: string; signs: AlphabetVowelSign[] };
  /** BCP 47 tags to look for a speech-synthesis voice with. */
  voiceLangs: string[];
  /** "draft" until a tutor has checked it; the page says which. */
  status: "draft" | "reviewed";
  updatedAt: string;
  updatedById?: string;
}

export type HolidayCategory = "poya" | "national" | "hindu" | "muslim" | "christian";

/** A Sri Lankan public holiday, shown on the portal calendar. */
export interface Holiday {
  id: string;
  /** yyyy-mm-dd */
  date: string;
  name: string;
  category: HolidayCategory;
  funFact: string;
  updatedAt: string;
}

/** A course stage's description, shown on its learning hub folder. Keyed by the stage name chapters use. */
export interface CourseStage {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

export type HeritageRegion = "Colombo" | "Cultural Triangle" | "Hill Country" | "South Coast" | "North" | "East";

/** A place for the (parked) heritage game. */
export interface HeritageSite {
  /** The slug, used in its URL. */
  id: string;
  name: string;
  alsoKnownAs?: string;
  sinhala?: string;
  tamil?: string;
  region: HeritageRegion;
  era: string;
  /** Real coordinates, projected onto the stylised island map. */
  lat: number;
  lng: number;
  unesco?: boolean;
  /** One line shown on the card. */
  hook: string;
  story: string[];
  facts: { label: string; value: string }[];
  /** Why this place is a meeting point of peoples — the Colombo thesis. */
  meltingPot?: string;
  /** The phrase list that pairs well with this site. */
  pairedChapter?: string;
  updatedAt: string;
}

/** Every kind of teaching content, by its URL name in /api/content/:kind. */
export interface ContentKinds {
  "phrase-lists": PhraseList;
  alphabet: AlphabetSheet;
  holidays: Holiday;
  stages: CourseStage;
  heritage: HeritageSite;
}

export type ContentKind = keyof ContentKinds;
