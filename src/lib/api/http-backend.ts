import { ApiError, type Backend, type GoogleSignInResult } from "./backend";
import { bumpRevision } from "./revision";
import type {
  AuditLogEntry,
  AvailabilityRule,
  Booking,
  CommunityPost,
  GameResult,
  GoogleCalendarStatus,
  HomeworkItem,
  LessonNote,
  MailMessage,
  Material,
  Message,
  PostReply,
  PublicProfile,
  Slot,
  StudentProgress,
  Thread,
  ThreadSummary,
  User,
  WaitlistEntry,
} from "@/lib/types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function url(path: string, query?: RequestOptions["query"]): string {
  const target = new URL(`${BASE}/api${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) target.searchParams.set(key, String(value));
  }
  return target.toString();
}

/**
 * Every call carries the session cookie, and any write bumps the revision so
 * mounted queries refetch. Errors from the API arrive as `{ error }` and are
 * rethrown as `ApiError`, which the UI already knows how to display.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";

  let response: Response;
  try {
    response = await fetch(url(path, options.query), {
      method,
      credentials: "include",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Could not reach the API at ${BASE}. Is the server running? (npm run dev in server/)`,
    );
  }

  if (method !== "GET") bumpRevision();

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const failure = (payload ?? {}) as { error?: unknown; code?: unknown };
    const message = failure.error
      ? String(failure.error)
      : `That request failed (${response.status}).`;
    throw new ApiError(message, failure.code ? String(failure.code) : undefined);
  }

  return payload as T;
}

export const httpBackend: Backend = {
  auth: {
    async currentUser() {
      const { user } = await request<{ user: User | null }>("/auth/me");
      return user;
    },

    signUp(input) {
      return request<{ email: string }>("/auth/signup", { method: "POST", body: input });
    },

    async verifyEmail(email, code) {
      const { user } = await request<{ user: User }>("/auth/verify", {
        method: "POST",
        body: { email, code },
      });
      return user;
    },

    resendVerification(email) {
      return request<void>("/auth/resend", { method: "POST", body: { email } });
    },

    async signIn(email, password) {
      const { user } = await request<{ user: User }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      return user;
    },

    withGoogle(input) {
      return request<GoogleSignInResult>("/auth/google", { method: "POST", body: input });
    },

    signOut() {
      return request<void>("/auth/logout", { method: "POST" });
    },

    requestPasswordReset(email) {
      return request<void>("/auth/forgot-password", { method: "POST", body: { email } });
    },

    async resetPassword(token, password) {
      const { user } = await request<{ user: User }>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });
      return user;
    },
  },

  users: {
    list() {
      return request<User[]>("/users");
    },

    directory() {
      return request<PublicProfile[]>("/users/directory");
    },

    get(id) {
      return request<User | null>(`/users/${id}`);
    },

    tutors() {
      return request<User[]>("/users/tutors");
    },

    update(id, patch) {
      return request<User>(`/users/${id}`, { method: "PATCH", body: patch });
    },

    setRole(id, role) {
      return request<User>(`/users/${id}/role`, { method: "POST", body: { role } });
    },

    setMembership(id, membership) {
      return request<User>(`/users/${id}/membership`, {
        method: "POST",
        body: { membership },
      });
    },

    remove(id) {
      return request<void>(`/users/${id}`, { method: "DELETE" });
    },

    tuteesOf(tutorId) {
      return request<User[]>(`/users/${tutorId}/tutees`);
    },

    tutorsOf(studentId) {
      return request<User[]>(`/users/${studentId}/tutors`);
    },

    auditLog() {
      return request<AuditLogEntry[]>("/users/audit-log");
    },
  },

  availability: {
    forTutor(tutorId) {
      return request<AvailabilityRule[]>("/availability", { query: { tutorId } });
    },

    add(rule) {
      return request<AvailabilityRule>("/availability", { method: "POST", body: rule });
    },

    remove(id) {
      return request<void>(`/availability/${id}`, { method: "DELETE" });
    },

    openSlots(tutorId, days = 14) {
      return request<Slot[]>("/availability/slots", { query: { tutorId, days } });
    },
  },

  bookings: {
    forUser(userId) {
      return request<Booking[]>("/bookings", { query: { userId } });
    },

    get(id) {
      return request<Booking | null>(`/bookings/${id}`);
    },

    create(input) {
      return request<Booking>("/bookings", { method: "POST", body: input });
    },

    pay(id) {
      return request<Booking>(`/bookings/${id}/pay`, { method: "POST" });
    },

    cancel(id) {
      return request<Booking>(`/bookings/${id}/cancel`, { method: "POST" });
    },

    complete(id) {
      return request<Booking>(`/bookings/${id}/complete`, { method: "POST" });
    },
  },

  materials: {
    forStudent(studentId) {
      return request<Material[]>("/materials", { query: { studentId } });
    },

    forOwner(ownerId) {
      return request<Material[]>("/materials", { query: { ownerId } });
    },

    library() {
      return request<Material[]>("/materials/library");
    },

    create(input) {
      return request<Material>("/materials", { method: "POST", body: input });
    },

    assign(id, studentIds) {
      return request<Material>(`/materials/${id}/assign`, {
        method: "POST",
        body: { studentIds },
      });
    },

    remove(id) {
      return request<void>(`/materials/${id}`, { method: "DELETE" });
    },
  },

  homework: {
    forStudent(studentId) {
      return request<HomeworkItem[]>("/homework", { query: { studentId } });
    },

    forTutor(tutorId) {
      return request<HomeworkItem[]>("/homework", { query: { tutorId } });
    },

    create(input) {
      return request<HomeworkItem>("/homework", { method: "POST", body: input });
    },

    submit(id, note) {
      return request<HomeworkItem>(`/homework/${id}/submit`, {
        method: "POST",
        body: { note },
      });
    },

    review(id, feedback, score) {
      return request<HomeworkItem>(`/homework/${id}/review`, {
        method: "POST",
        body: { feedback, score },
      });
    },
  },

  lessonNotes: {
    forStudent(studentId) {
      return request<LessonNote[]>("/lesson-notes", { query: { studentId } });
    },

    progressFor(tutorId) {
      return request<StudentProgress[]>("/progress", { query: { tutorId } });
    },

    progressOf(studentId) {
      return request<StudentProgress | null>(`/progress/${studentId}`);
    },
  },

  community: {
    feed() {
      return request<CommunityPost[]>("/posts");
    },

    pending() {
      return request<CommunityPost[]>("/posts/pending");
    },

    create(input) {
      return request<CommunityPost>("/posts", { method: "POST", body: input });
    },

    toggleLike(postId) {
      return request<CommunityPost>(`/posts/${postId}/like`, { method: "POST" });
    },

    reply(postId, _authorId, body) {
      return request<PostReply>(`/posts/${postId}/replies`, {
        method: "POST",
        body: { body },
      });
    },

    repliesFor(postId) {
      return request<PostReply[]>(`/posts/${postId}/replies`);
    },

    moderate(postId, status, note) {
      return request<CommunityPost>(`/posts/${postId}/moderate`, {
        method: "POST",
        body: { status, note },
      });
    },
  },

  messages: {
    threadsFor() {
      return request<ThreadSummary[]>("/threads");
    },

    ensureThread(_a, b) {
      return request<Thread>("/threads", { method: "POST", body: { userId: b } });
    },

    forThread(threadId) {
      return request<Message[]>(`/threads/${threadId}/messages`);
    },

    send(threadId, _senderId, body) {
      return request<Message>(`/threads/${threadId}/messages`, {
        method: "POST",
        body: { body },
      });
    },

    markRead(threadId) {
      return request<void>(`/threads/${threadId}/read`, { method: "POST" });
    },
  },

  waitlist: {
    join(input) {
      return request<WaitlistEntry>("/waitlist", { method: "POST", body: input });
    },

    list() {
      return request<WaitlistEntry[]>("/waitlist");
    },
  },

  mail: {
    inbox() {
      return request<MailMessage[]>("/mail");
    },

    markRead(id) {
      return request<void>(`/mail/${id}/read`, { method: "POST" });
    },

    clear() {
      return request<void>("/mail", { method: "DELETE" });
    },
  },

  demo: {
    reset() {
      return request<void>("/demo/reset", { method: "POST" });
    },
  },

  games: {
    resultsFor(userId) {
      return request<GameResult[]>("/games/results", { query: { userId } });
    },

    record(_userId, chapterId, script, correct, total) {
      return request<GameResult>("/games/results", {
        method: "POST",
        body: { chapterId, script, correct, total },
      });
    },
  },

  integrations: {
    google: {
      status() {
        return request<GoogleCalendarStatus>("/integrations/google/status");
      },

      connectUrl() {
        return url("/integrations/google/connect");
      },

      disconnect() {
        return request<void>("/integrations/google/disconnect", { method: "POST" });
      },

      mailStatus() {
        return request<GoogleCalendarStatus>("/integrations/google/mail/status");
      },

      mailConnectUrl() {
        return url("/integrations/google/mail/connect");
      },

      mailDisconnect() {
        return request<void>("/integrations/google/mail/disconnect", { method: "POST" });
      },
    },
  },
};
