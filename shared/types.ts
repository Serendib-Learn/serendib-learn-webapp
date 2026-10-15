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
}

export type PostStatus = "pending" | "approved" | "rejected";

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
}

/** A conversation with the other participant and unread count folded in. */
export interface ThreadSummary {
  thread: Thread;
  other: User;
  lastMessage?: Message;
  unread: number;
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
