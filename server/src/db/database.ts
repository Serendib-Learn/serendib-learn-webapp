import { config } from "../config.ts";
import { hashPassword } from "../lib/passwords.ts";
import { openMongoStore } from "./mongo-store.ts";
import { openStore, type Collection, type Doc, type Store } from "./store.ts";
import { defaultChapters } from "../../../shared/curriculum.ts";
import { DEMO_PASSWORD, createSeedData } from "../../../shared/seed.ts";
import { alphabetSeed } from "../seed/alphabet.ts";
import { heritageSeed } from "../seed/heritage.ts";
import { holidaySeed } from "../seed/holidays.ts";
import { phraseListSeed } from "../seed/phrase-lists.ts";
import { stageSeed } from "../seed/stages.ts";
import type {
  AlphabetSheet,
  AuditLogEntry,
  AvailabilityRule,
  Booking,
  CommunityPost,
  Connection,
  CourseChapter,
  CourseStage,
  GameResult,
  HeritageSite,
  Holiday,
  HomeworkItem,
  LessonCredit,
  LessonNote,
  MailMessage,
  Material,
  MaterialFeedback,
  Message,
  PhraseList,
  PostReply,
  SessionFeedback,
  StudentRequest,
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

/** A photo attached to a community post. Base64, capped by the upload route. */
export interface PostImage extends Doc {
  id: string;
  ownerId: string;
  mimeType: string;
  data: string;
  createdAt: string;
}

/** Someone's profile photo, shown on the tutors page. Keyed by their user id. */
export interface ProfilePhoto extends Doc {
  /** Same value as the user id. */
  id: string;
  mimeType: string;
  data: string;
  updatedAt: string;
}

/**
 * A tutor's recording of one alphabet letter or example word, played to
 * everyone on the alphabet sheet. Keyed "<language>:<audioKey>".
 */
export interface AlphabetAudio extends Doc {
  id: string;
  language: "sinhala" | "tamil";
  key: string;
  mimeType: string;
  data: string;
  recordedBy: string;
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
  postImages: Collection<PostImage>;
  alphabetAudio: Collection<AlphabetAudio>;
  profilePhotos: Collection<ProfilePhoto>;
  lessonCredits: Collection<LessonCredit>;
  materialFeedback: Collection<MaterialFeedback>;
  studentRequests: Collection<StudentRequest>;
  /** Teaching content — see `ContentKinds` in shared/types.ts and routes/content.ts. */
  phraseLists: Collection<PhraseList>;
  alphabetSheets: Collection<AlphabetSheet>;
  holidays: Collection<Holiday>;
  courseStages: Collection<CourseStage>;
  heritageSites: Collection<HeritageSite>;
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
    postImages: from.collection<PostImage>("postImages"),
    alphabetAudio: from.collection<AlphabetAudio>("alphabetAudio"),
    profilePhotos: from.collection<ProfilePhoto>("profilePhotos"),
    lessonCredits: from.collection<LessonCredit>("lessonCredits"),
    materialFeedback: from.collection<MaterialFeedback>("materialFeedback"),
    studentRequests: from.collection<StudentRequest>("studentRequests"),
    phraseLists: from.collection<PhraseList>("phraseLists"),
    alphabetSheets: from.collection<AlphabetSheet>("alphabetSheets"),
    holidays: from.collection<Holiday>("holidays"),
    courseStages: from.collection<CourseStage>("courseStages"),
    heritageSites: from.collection<HeritageSite>("heritageSites"),
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
    postImages: [],
    alphabetAudio: [],
    profilePhotos: [],
    lessonCredits: [],
    materialFeedback: [],
    studentRequests: [],
    phraseLists: [],
    alphabetSheets: [],
    holidays: [],
    courseStages: [],
    heritageSites: [],
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

  await seedTeachingContent(database);
  await priceOldBookingsInRupees(database);
  return database;
}

/**
 * Bookings made before prices were in rupees (October 2026) had only a
 * dollar price: give each its rupee price once, at `USD_TO_LKR` — what its
 * checkout charged, or would have.
 */
async function priceOldBookingsInRupees(target: Database): Promise<void> {
  const old = await target.bookings.find({ priceLkr: { $exists: false } });
  for (const booking of old) {
    await target.bookings.updateOne(
      { id: booking.id },
      { priceLkr: Math.round((booking.priceUsd ?? 0) * config.payments.usdToLkr) },
    );
  }
  if (old.length) console.log(`Priced ${old.length} older bookings in rupees.`);
}

/**
 * Not demo data: every site starts with the course outline and its teaching
 * content, demo or not — each collection filled once, while it is empty.
 * From then on the database is the only source; it changes through the API
 * (the portal's content editor), never by editing server/src/seed/.
 */
async function seedTeachingContent(target: Database): Promise<void> {
  const now = new Date().toISOString();
  const fill = async <T extends Doc>(collection: Collection<T>, docs: T[], label: string) => {
    if ((await collection.count()) > 0) return;
    for (const doc of docs) await collection.insertOne(doc);
    console.log(`Filled ${label} (${docs.length}).`);
  };

  await fill(
    target.chapters,
    defaultChapters.map((chapter) => ({ ...chapter, createdAt: now })),
    "the course chapters",
  );
  await fill(target.phraseLists, phraseListSeed.map((item) => ({ ...item, updatedAt: now })), "phrase lists");
  await fill(target.alphabetSheets, alphabetSeed.map((item) => ({ ...item, updatedAt: now })), "alphabet sheets");
  await fill(target.holidays, holidaySeed.map((item) => ({ ...item, updatedAt: now })), "holidays");
  await fill(target.courseStages, stageSeed.map((item) => ({ ...item, updatedAt: now })), "course stages");
  await fill(target.heritageSites, heritageSeed.map((item) => ({ ...item, updatedAt: now })), "heritage sites");
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
  if (database) await seedTeachingContent(database);
}
