import { config } from "../config.ts";
import { hashPassword } from "../lib/passwords.ts";
import { openMongoStore } from "./mongo-store.ts";
import { openStore, type Collection, type Doc, type Store } from "./store.ts";
import { defaultChapters } from "../../../shared/curriculum.ts";
import { DEMO_PASSWORD, createSeedData } from "../../../shared/seed.ts";
import type {
  AuditLogEntry,
  AvailabilityRule,
  Booking,
  CommunityPost,
  Connection,
  CourseChapter,
  GameResult,
  HomeworkItem,
  LessonNote,
  MailMessage,
  Material,
  Message,
  PostReply,
  SessionFeedback,
  Thread,
  User,
  WaitlistEntry,
} from "../../../shared/types.ts";

/** Password material for one account. Never leaves the server. */
export interface Credential extends Doc {
  /** Same value as the user id. */
  id: string;
  hash: string;
}

export interface Session extends Doc {
  /** The opaque token that goes in the cookie. */
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface PendingCode extends Doc {
  /** The email address, lowercased. */
  id: string;
  code: string;
  createdAt: string;
}

export interface ResetToken extends Doc {
  id: string;
  email: string;
  createdAt: string;
  /**
   * When the link stops working. Tokens written before this field existed
   * fall back to a day after `createdAt` (see lib/accounts.ts).
   */
  expiresAt?: string;
}

/** The `googleAccounts` row for the site's shared Serendib calendar. */
export const SYSTEM_CALENDAR_ID = "system";

/** A Google account linked for Calendar + Meet. Separate from sign-in. */
export interface GoogleAccount extends Doc {
  /**
   * Same value as the user id — or `SYSTEM_CALENDAR_ID` for the site's own
   * calendar, which an admin connects once and which makes Meet links for
   * every tutor who has not connected their own.
   */
  id: string;
  refreshToken: string;
  email: string;
  connectedAt: string;
}

/**
 * The single Google account authorized to send mail for the whole site, via
 * Gmail. Unlike `GoogleAccount`, this is not per-user — one admin connects it
 * once, from the admin area's Mail tab, and every outgoing notification sends
 * from that account. Always looked up by the fixed id `"system"`.
 */
export interface GoogleMailer extends Doc {
  id: string;
  refreshToken: string;
  email: string;
  connectedAt: string;
}

/** A one-time, short-lived record proving who started a Google connect flow. */
export interface OAuthState extends Doc {
  /** The random state value handed to Google and back. */
  id: string;
  userId: string;
  /** Which connection this state is for — the callback trusts this, not the URL it hit. */
  purpose: "calendar" | "mail" | "system-calendar";
  createdAt: string;
}

/** A Payments.lk webhook already handled. Deliveries of one event share its id. */
export interface PaymentEvent extends Doc {
  id: string;
  type: string;
  receivedAt: string;
}

/** A recorded voice note. The audio stays on the server, base64 encoded. */
export interface VoiceNote extends Doc {
  id: string;
  ownerId: string;
  bookingId: string;
  mimeType: string;
  durationSec: number;
  /** Base64 audio. Capped well under MongoDB's 16 MB document limit by the upload route. */
  data: string;
  createdAt: string;
}

export interface Database {
  users: Collection<User>;
  credentials: Collection<Credential>;
  sessions: Collection<Session>;
  verificationCodes: Collection<PendingCode>;
  resetTokens: Collection<ResetToken>;
  auditLog: Collection<AuditLogEntry>;
  googleAccounts: Collection<GoogleAccount>;
  googleMailer: Collection<GoogleMailer>;
  oauthStates: Collection<OAuthState>;
  availability: Collection<AvailabilityRule>;
  bookings: Collection<Booking>;
  materials: Collection<Material>;
  homework: Collection<HomeworkItem>;
  lessonNotes: Collection<LessonNote>;
  posts: Collection<CommunityPost>;
  replies: Collection<PostReply>;
  threads: Collection<Thread>;
  messages: Collection<Message>;
  waitlist: Collection<WaitlistEntry>;
  mail: Collection<MailMessage>;
  gameResults: Collection<GameResult>;
  paymentEvents: Collection<PaymentEvent>;
  feedback: Collection<SessionFeedback>;
  chapters: Collection<CourseChapter>;
  connections: Collection<Connection>;
  voiceNotes: Collection<VoiceNote>;
}

let store: Store | null = null;
let database: Database | null = null;

function build(from: Store): Database {
  return {
    users: from.collection<User>("users"),
    credentials: from.collection<Credential>("credentials"),
    sessions: from.collection<Session>("sessions"),
    verificationCodes: from.collection<PendingCode>("verificationCodes"),
    resetTokens: from.collection<ResetToken>("resetTokens"),
    auditLog: from.collection<AuditLogEntry>("auditLog"),
    googleAccounts: from.collection<GoogleAccount>("googleAccounts"),
    googleMailer: from.collection<GoogleMailer>("googleMailer"),
    oauthStates: from.collection<OAuthState>("oauthStates"),
    availability: from.collection<AvailabilityRule>("availability"),
    bookings: from.collection<Booking>("bookings"),
    materials: from.collection<Material>("materials"),
    homework: from.collection<HomeworkItem>("homework"),
    lessonNotes: from.collection<LessonNote>("lessonNotes"),
    posts: from.collection<CommunityPost>("posts"),
    replies: from.collection<PostReply>("replies"),
    threads: from.collection<Thread>("threads"),
    messages: from.collection<Message>("messages"),
    waitlist: from.collection<WaitlistEntry>("waitlist"),
    mail: from.collection<MailMessage>("mail"),
    gameResults: from.collection<GameResult>("gameResults"),
    paymentEvents: from.collection<PaymentEvent>("paymentEvents"),
    feedback: from.collection<SessionFeedback>("feedback"),
    chapters: from.collection<CourseChapter>("chapters"),
    connections: from.collection<Connection>("connections"),
    voiceNotes: from.collection<VoiceNote>("voiceNotes"),
  };
}

/** Everything the seed writes, with demo passwords hashed properly. */
async function seedContents(): Promise<Record<string, Doc[]>> {
  const seed = createSeedData();
  const credentials: Credential[] = [];

  for (const user of seed.users) {
    credentials.push({ id: user.id, hash: await hashPassword(DEMO_PASSWORD) });
  }

  return {
    users: seed.users,
    credentials,
    sessions: [],
    verificationCodes: [],
    resetTokens: [],
    auditLog: [],
    googleAccounts: [],
    googleMailer: [],
    oauthStates: [],
    availability: seed.availability,
    bookings: seed.bookings,
    materials: seed.materials,
    homework: seed.homework,
    lessonNotes: seed.lessonNotes,
    posts: seed.posts,
    replies: seed.replies,
    threads: seed.threads,
    messages: seed.messages,
    waitlist: seed.waitlist,
    mail: seed.mail,
    gameResults: seed.gameResults,
    paymentEvents: [],
    feedback: [],
    connections: [],
    chapters: defaultChapters.map((chapter) => ({ ...chapter, createdAt: new Date().toISOString() })),
    voiceNotes: [],
  };
}

export async function connect(): Promise<Database> {
  if (database) return database;

  const usingMongo = config.mongodbUri !== "";
  store = usingMongo
    ? await openMongoStore(config.mongodbUri, config.mongodbDbName)
    : await openStore(config.dataFile);
  database = build(store);

  if (await store.isEmpty()) {
    // The seed's accounts all share a published password, including an
    // administrator — fine for a demo, a backdoor anywhere else. A real
    // deployment starts empty and gets its first account from
    // SUPER_ADMIN_EMAIL instead (lib/accounts.ts's ensureSuperAdmin).
    if (config.demoMode) {
      await store.replaceAll(await seedContents());
      console.log(
        `Seeded a fresh database (${usingMongo ? `MongoDB: ${config.mongodbDbName}` : config.dataFile})`,
      );
    } else {
      console.log("Fresh database and DEMO_MODE=false: not seeding demo accounts.");
    }
  }

  // Not demo data: every site starts with the course outline, demo or not.
  if ((await database.chapters.count()) === 0) {
    const createdAt = new Date().toISOString();
    for (const chapter of defaultChapters) {
      await database.chapters.insertOne({ ...chapter, createdAt });
    }
  }

  return database;
}

/**
 * Closes the underlying connection (a real one for MongoDB) and forgets the
 * cached instance, so a later `connect()` reconnects from scratch. Needed
 * for tests, which each spin up their own database and must not leak a
 * client — an unclosed MongoClient keeps its monitoring timers running,
 * which keeps the process alive even after everything else is done.
 */
export async function disconnect(): Promise<void> {
  await store?.close?.();
  store = null;
  database = null;
}

export function db(): Database {
  if (!database) throw new Error("connect() has not run yet.");
  return database;
}

/** Demo-only: throw everything away and seed again. */
export async function reseed(): Promise<void> {
  if (!store) throw new Error("connect() has not run yet.");
  await store.replaceAll(await seedContents());
}
