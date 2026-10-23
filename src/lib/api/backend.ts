import type {
  AuditLogEntry,
  AvailabilityRule,
  Booking,
  BookingInput,
  CommunityMember,
  CommunityPost,
  CommunityPostInput,
  Connection,
  CourseChapter,
  GameResult,
  GoogleCalendarStatus,
  GoogleSignInInput,
  HomeworkInput,
  HomeworkItem,
  InviteInput,
  LanguageCode,
  LessonNote,
  LessonNoteInput,
  MailMessage,
  Material,
  MaterialInput,
  Message,
  PostReply,
  PaymentsConfig,
  PendingFeedback,
  PostStatus,
  PublicProfile,
  PublicTutor,
  Role,
  SessionFeedback,
  SessionFeedbackInput,
  SignUpInput,
  Slot,
  StudentProgress,
  Thread,
  ThreadSummary,
  TutorStatus,
  User,
  VoiceNoteInfo,
  WaitlistEntry,
} from "@/lib/types";

export class ApiError extends Error {
  /** Set when the API tagged the failure, so the UI can branch on it. */
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/** An account that Google sign-in has just created, versus one it logged into. */
export interface GoogleSignInResult {
  user: User;
  created: boolean;
}

export type { StudentProgress, ThreadSummary } from "@/lib/types";

/**
 * The whole data surface of the app. The in-browser demo implementation lives
 * in `mock-backend.ts`; a server-backed implementation only has to satisfy this
 * interface for the UI to keep working unchanged.
 */
export interface Backend {
  /** Cheap, unauthenticated status probe — used to check whether demo-only features are live. */
  health(): Promise<{ ok: boolean; demoMode: boolean }>;

  auth: {
    currentUser(): Promise<User | null>;
    signUp(input: SignUpInput): Promise<{ email: string }>;
    verifyEmail(email: string, code: string): Promise<User>;
    resendVerification(email: string): Promise<void>;
    signIn(email: string, password: string): Promise<User>;
    /**
     * Exchanges a Google ID token for a session. Throws with code
     * `no_account` when `intent` is `login` and nobody has signed up yet.
     */
    withGoogle(input: GoogleSignInInput): Promise<GoogleSignInResult>;
    signOut(): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, password: string): Promise<User>;
  };

  users: {
    /** Full records. Administrators only. */
    list(): Promise<User[]>;
    /** Names and roles for every member, for labelling things in the portal. */
    directory(): Promise<PublicProfile[]>;
    get(id: string): Promise<User | null>;
    /** Approved tutors, as the public sees them. */
    tutors(): Promise<PublicTutor[]>;
    /**
     * Administrators: create an account for someone and email them a
     * set-password link — or, for a tutor with no email given, list them now
     * and invite them later with `addEmail`.
     */
    invite(input: InviteInput): Promise<User>;
    /** Administrators: give an account listed without an email its address, and send the invite. */
    addEmail(id: string, email: string): Promise<User>;
    /** A tutor's photo for the tutors page (the tutor, or an administrator). */
    uploadPhoto(id: string, photo: { mimeType: string; data: string }): Promise<User>;
    removePhoto(id: string): Promise<User>;
    /** Administrators: approve or turn down a tutor's application. */
    setTutorStatus(id: string, status: TutorStatus, note?: string): Promise<User>;
    update(id: string, patch: Partial<User>): Promise<User>;
    setRole(id: string, role: Role): Promise<User>;
    setMembership(id: string, membership: User["membership"]): Promise<User>;
    remove(id: string): Promise<void>;
    tuteesOf(tutorId: string): Promise<User[]>;
    tutorsOf(studentId: string): Promise<User[]>;
    /** Recent admin actions — role/membership changes, deletions, moderation. */
    auditLog(): Promise<AuditLogEntry[]>;
  };

  payments: {
    config(): Promise<PaymentsConfig>;
  };

  availability: {
    forTutor(tutorId: string): Promise<AvailabilityRule[]>;
    add(rule: Omit<AvailabilityRule, "id">): Promise<AvailabilityRule>;
    remove(id: string): Promise<void>;
    openSlots(tutorId: string, days?: number): Promise<Slot[]>;
  };

  bookings: {
    forUser(userId: string): Promise<Booking[]>;
    get(id: string): Promise<Booking | null>;
    create(input: BookingInput): Promise<Booking>;
    /** Demo checkout, or an admin marking a booking paid. Refused for students once card payments are on. */
    pay(id: string): Promise<Booking>;
    /** Starts or resumes the Payments.lk checkout; send the browser to `url`. */
    startCheckout(id: string): Promise<{ url: string; booking: Booking }>;
    /** The booking after the API has checked its payment with Payments.lk. */
    paymentStatus(id: string): Promise<Booking>;
    /** The booking's tutor (or an admin) puts a meeting link on it by hand. */
    setMeetingLink(id: string, url: string): Promise<Booking>;
    cancel(id: string): Promise<Booking>;
    complete(id: string): Promise<Booking>;
  };

  materials: {
    forStudent(studentId: string): Promise<Material[]>;
    forOwner(ownerId: string): Promise<Material[]>;
    library(): Promise<Material[]>;
    create(input: MaterialInput): Promise<Material>;
    assign(id: string, studentIds: string[]): Promise<Material>;
    /** Files a material under a chapter; no chapter unfiles it. */
    setChapter(id: string, chapterId: string | undefined): Promise<Material>;
    remove(id: string): Promise<void>;
  };

  chapters: {
    /** The course outline, in order. */
    list(): Promise<CourseChapter[]>;
    create(input: Omit<CourseChapter, "id" | "createdAt">): Promise<CourseChapter>;
    update(id: string, patch: Partial<Omit<CourseChapter, "id" | "createdAt">>): Promise<CourseChapter>;
    remove(id: string): Promise<void>;
  };

  homework: {
    forStudent(studentId: string): Promise<HomeworkItem[]>;
    forTutor(tutorId: string): Promise<HomeworkItem[]>;
    create(input: HomeworkInput): Promise<HomeworkItem>;
    submit(id: string, note: string): Promise<HomeworkItem>;
    review(id: string, feedback: string, score: number): Promise<HomeworkItem>;
  };

  lessonNotes: {
    forStudent(studentId: string): Promise<LessonNote[]>;
    progressFor(tutorId: string): Promise<StudentProgress[]>;
    progressOf(studentId: string): Promise<StudentProgress | null>;
    /** The tutor's write-up of a finished lesson. */
    write(input: LessonNoteInput): Promise<LessonNote>;
  };

  feedback: {
    /** Finished lessons still waiting on the signed-in person's part. */
    pending(): Promise<PendingFeedback[]>;
    give(input: SessionFeedbackInput): Promise<SessionFeedback>;
    forTutor(tutorId: string): Promise<SessionFeedback[]>;
    forStudent(studentId: string): Promise<SessionFeedback[]>;
    /** Administrators: everything, newest first. */
    all(): Promise<SessionFeedback[]>;
  };

  voiceNotes: {
    upload(bookingId: string, recording: Blob, durationSec: number): Promise<VoiceNoteInfo>;
    /** The audio, fetched with the session cookie. */
    audio(id: string): Promise<Blob>;
  };

  community: {
    feed(): Promise<CommunityPost[]>;
    pending(): Promise<CommunityPost[]>;
    create(input: CommunityPostInput): Promise<CommunityPost>;
    toggleLike(postId: string, userId: string): Promise<CommunityPost>;
    reply(postId: string, authorId: string, body: string): Promise<PostReply>;
    repliesFor(postId: string): Promise<PostReply[]>;
    moderate(postId: string, status: PostStatus, note?: string): Promise<CommunityPost>;
    /** Uploads a photo for a post (resized in the browser first); returns its id. */
    uploadImage(file: File): Promise<{ id: string }>;
    /** A post's photo, fetched with the session cookie. */
    image(id: string): Promise<Blob>;
    /** Vetted fellow learners, optionally only those learning `language`. */
    members(language?: LanguageCode): Promise<CommunityMember[]>;
    /** Friends and open requests, in either direction. */
    connections(): Promise<CommunityMember[]>;
    /** Sends a friend request, or accepts theirs if they already asked. */
    connect(userId: string): Promise<Connection>;
    accept(connectionId: string): Promise<Connection>;
    decline(connectionId: string): Promise<Connection>;
    /** Cancels a request you sent, or removes a friend. */
    disconnect(connectionId: string): Promise<void>;
  };

  messages: {
    threadsFor(userId: string): Promise<ThreadSummary[]>;
    ensureThread(a: string, b: string): Promise<Thread>;
    forThread(threadId: string): Promise<Message[]>;
    send(threadId: string, senderId: string, body: string): Promise<Message>;
    markRead(threadId: string, userId: string): Promise<void>;
  };

  alphabetAudio: {
    /** Which letters and words our tutors have recorded. Public. */
    list(): Promise<{ language: LanguageCode; key: string; createdAt: string }[]>;
    /** Where a recording plays from — a plain URL, usable by <audio>. */
    url(language: LanguageCode, key: string, version?: string): string;
    /** Tutors and admins: record (or replace) one letter or word. */
    record(language: LanguageCode, key: string, recording: Blob): Promise<void>;
    remove(language: LanguageCode, key: string): Promise<void>;
  };

  waitlist: {
    join(
      input: Omit<WaitlistEntry, "id" | "createdAt"> & { turnstileToken?: string },
    ): Promise<WaitlistEntry>;
    list(): Promise<WaitlistEntry[]>;
  };

  mail: {
    inbox(): Promise<MailMessage[]>;
    markRead(id: string): Promise<void>;
    clear(): Promise<void>;
  };

  /** Demo-only escape hatch: wipe everything back to the seeded state. */
  demo: {
    reset(): Promise<void>;
  };

  integrations: {
    google: {
      status(): Promise<GoogleCalendarStatus>;
      /** Full-page navigation target, not a fetch — Google's consent screen is not an XHR. */
      connectUrl(): string;
      disconnect(): Promise<void>;

      /**
       * The site's one shared account for sending mail through Gmail —
       * admin-only, separate from any tutor's own Calendar connection.
       */
      mailStatus(): Promise<GoogleCalendarStatus>;
      mailConnectUrl(): string;
      mailDisconnect(): Promise<void>;

      /**
       * The site's shared Serendib calendar — admin-only. Makes the Meet link
       * for any booking whose tutor has not connected their own calendar.
       */
      systemCalendarStatus(): Promise<GoogleCalendarStatus>;
      systemCalendarConnectUrl(): string;
      systemCalendarDisconnect(): Promise<void>;

      /** Sends a real email through the connected Gmail account, to you. */
      testMail(): Promise<{ sentTo: string; from: string }>;
      /** Makes (and deletes) a real Meet link on the Serendib calendar. */
      testSystemCalendar(): Promise<{ meetLink: string; calendar: string }>;
    };
  };

  games: {
    resultsFor(userId: string): Promise<GameResult[]>;
    record(
      userId: string,
      chapterId: string,
      script: LanguageCode,
      correct: number,
      total: number,
    ): Promise<GameResult>;
  };
}
