/**
 * Domain types used by both the Next.js app and the API service in `server/`.
 * This is the contract between them: change it here and both sides see it.
 */

export type Role = "student" | "tutor" | "admin";

export type LanguageCode = "sinhala" | "tamil";

export type MembershipStatus = "none" | "active";

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
  /** Google's stable subject id, set once an account has been linked. */
  googleId?: string;
  /** Profile picture from Google, when there is one. */
  avatarUrl?: string;
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
}

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

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, "admin">;
  languages: LanguageCode[];
  timezone: string;
  /** Cloudflare Turnstile token. Required only when the server has CAPTCHA configured. */
  turnstileToken?: string;
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
