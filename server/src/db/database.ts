import { config } from "../config.ts";
import { hashPassword } from "../lib/passwords.ts";
import { openMongoStore } from "./mongo-store.ts";
import { openStore, type Collection, type Doc, type Store } from "./store.ts";
import { DEMO_PASSWORD, createSeedData } from "../../../shared/seed.ts";
import type {
  AvailabilityRule,
  Booking,
  CommunityPost,
  GameResult,
  HomeworkItem,
  LessonNote,
  MailMessage,
  Material,
  Message,
  PostReply,
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
}

/** A Google account linked for Calendar + Meet. Separate from sign-in. */
export interface GoogleAccount extends Doc {
  /** Same value as the user id. */
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
  purpose: "calendar" | "mail";
  createdAt: string;
}

export interface Database {
  users: Collection<User>;
  credentials: Collection<Credential>;
  sessions: Collection<Session>;
  verificationCodes: Collection<PendingCode>;
  resetTokens: Collection<ResetToken>;
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
    await store.replaceAll(await seedContents());
    console.log(
      `Seeded a fresh database (${usingMongo ? `MongoDB: ${config.mongodbDbName}` : config.dataFile})`,
    );
  }

  return database;
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
