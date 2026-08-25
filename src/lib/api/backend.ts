import type {
  AvailabilityRule,
  Booking,
  BookingInput,
  CommunityPost,
  CommunityPostInput,
  GameResult,
  GoogleCalendarStatus,
  GoogleSignInInput,
  HomeworkInput,
  HomeworkItem,
  LanguageCode,
  LessonNote,
  MailMessage,
  Material,
  MaterialInput,
  Message,
  PostReply,
  PostStatus,
  PublicProfile,
  Role,
  SignUpInput,
  Slot,
  StudentProgress,
  Thread,
  ThreadSummary,
  User,
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
    tutors(): Promise<User[]>;
    update(id: string, patch: Partial<User>): Promise<User>;
    setRole(id: string, role: Role): Promise<User>;
    setMembership(id: string, membership: User["membership"]): Promise<User>;
    remove(id: string): Promise<void>;
    tuteesOf(tutorId: string): Promise<User[]>;
    tutorsOf(studentId: string): Promise<User[]>;
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
    pay(id: string): Promise<Booking>;
    cancel(id: string): Promise<Booking>;
    complete(id: string): Promise<Booking>;
  };

  materials: {
    forStudent(studentId: string): Promise<Material[]>;
    forOwner(ownerId: string): Promise<Material[]>;
    library(): Promise<Material[]>;
    create(input: MaterialInput): Promise<Material>;
    assign(id: string, studentIds: string[]): Promise<Material>;
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
  };

  community: {
    feed(): Promise<CommunityPost[]>;
    pending(): Promise<CommunityPost[]>;
    create(input: CommunityPostInput): Promise<CommunityPost>;
    toggleLike(postId: string, userId: string): Promise<CommunityPost>;
    reply(postId: string, authorId: string, body: string): Promise<PostReply>;
    repliesFor(postId: string): Promise<PostReply[]>;
    moderate(postId: string, status: PostStatus, note?: string): Promise<CommunityPost>;
  };

  messages: {
    threadsFor(userId: string): Promise<ThreadSummary[]>;
    ensureThread(a: string, b: string): Promise<Thread>;
    forThread(threadId: string): Promise<Message[]>;
    send(threadId: string, senderId: string, body: string): Promise<Message>;
    markRead(threadId: string, userId: string): Promise<void>;
  };

  waitlist: {
    join(input: Omit<WaitlistEntry, "id" | "createdAt">): Promise<WaitlistEntry>;
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
