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
  | "createdAt"
>;

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
  createdAt?: string;
}

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
  createdAt: string;
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
}

export interface SessionFeedbackInput {
  bookingId: string;
  rating: number;
  comment: string;
  voiceNoteId?: string;
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
  email: string;
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
