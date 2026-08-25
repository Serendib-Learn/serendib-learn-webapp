import { MongoClient } from "mongodb";
import type { Collection as MongoNativeCollection, Filter as MongoFilter } from "mongodb";
import type { Collection, Doc, FindOptions, Filter, Store } from "./store.ts";

/**
 * The real-database implementation of the `Store`/`Collection` surface
 * defined in `store.ts`. `Filter<T>` was deliberately given Mongo's own
 * operator names (`$in`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$exists`), so
 * it passes straight through to the driver — the only place this store
 * diverges from a thin pass-through is `sort`, which `store.ts` types as a
 * JS comparator rather than a Mongo sort spec (routes already pass real
 * closures like `(a, b) => a.startsAt.localeCompare(b.startsAt)`), so
 * sorting and limiting happen in Node after fetching, exactly like the JSON
 * store does. Fine at this app's scale; revisit if a collection gets huge.
 *
 * Documents keep the app's own string `id` field. Mongo still adds its own
 * `_id` to every document — nothing here reads it, and every read strips it
 * via projection so it never leaks into an API response.
 */

function clone<T>(value: T): T {
  return structuredClone(value);
}

class MongoDocCollection<T extends Doc> implements Collection<T> {
  #col: MongoNativeCollection<T>;

  constructor(col: MongoNativeCollection<T>) {
    this.#col = col;
  }

  #mongoFilter(filter: Filter<T> = {}): MongoFilter<T> {
    return filter as MongoFilter<T>;
  }

  async find(filter: Filter<T> = {}, options: FindOptions<T> = {}): Promise<T[]> {
    const found = (await this.#col
      .find(this.#mongoFilter(filter), { projection: { _id: 0 } })
      .toArray()) as T[];

    let results = found;
    if (options.sort) results = results.slice().sort(options.sort);
    if (options.limit !== undefined) results = results.slice(0, options.limit);
    return results;
  }

  async findOne(filter: Filter<T>, options: FindOptions<T> = {}): Promise<T | null> {
    const [first] = await this.find(filter, { ...options, limit: 1 });
    return first ?? null;
  }

  async findById(id: string): Promise<T | null> {
    return this.findOne({ id } as Filter<T>);
  }

  async insertOne(doc: T): Promise<T> {
    // The driver mutates whatever object it inserts, stamping an `_id` onto
    // it — insert a throwaway clone so the caller's own `doc` (and what we
    // hand back) stays exactly T-shaped.
    await this.#col.insertOne(clone(doc) as never);
    return clone(doc);
  }

  async insertMany(docs: T[]): Promise<T[]> {
    if (docs.length > 0) {
      await this.#col.insertMany(docs.map((doc) => clone(doc)) as never[]);
    }
    return clone(docs);
  }

  async updateOne(filter: Filter<T>, changes: Partial<T>): Promise<T | null> {
    const result = await this.#col.findOneAndUpdate(
      this.#mongoFilter(filter),
      { $set: clone(changes) },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    return (result as T | null) ?? null;
  }

  async updateMany(filter: Filter<T>, changes: Partial<T>): Promise<number> {
    const result = await this.#col.updateMany(this.#mongoFilter(filter), {
      $set: clone(changes),
    });
    return result.modifiedCount;
  }

  async deleteOne(filter: Filter<T>): Promise<boolean> {
    const result = await this.#col.deleteOne(this.#mongoFilter(filter));
    return result.deletedCount > 0;
  }

  async deleteMany(filter: Filter<T>): Promise<number> {
    const result = await this.#col.deleteMany(this.#mongoFilter(filter));
    return result.deletedCount;
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    return this.#col.countDocuments(this.#mongoFilter(filter));
  }
}

class MongoDbStore implements Store {
  #client: MongoClient;
  #db: ReturnType<MongoClient["db"]>;

  constructor(client: MongoClient, dbName: string) {
    this.#client = client;
    this.#db = client.db(dbName);
  }

  collection<T extends Doc>(name: string): Collection<T> {
    return new MongoDocCollection<T>(this.#db.collection<T>(name));
  }

  async replaceAll(contents: Record<string, Doc[]>): Promise<void> {
    for (const [name, docs] of Object.entries(contents)) {
      const col = this.#db.collection(name);
      await col.deleteMany({});
      if (docs.length > 0) await col.insertMany(docs.map((doc) => clone(doc)) as never[]);
    }
  }

  async isEmpty(): Promise<boolean> {
    // "Empty" means "never seeded". Checking for the *existence* of
    // collections would not work here: `openMongoStore` creates an index on
    // every collection up front (see below), and Mongo creates a collection
    // implicitly the moment an index is created on it — so every collection
    // already "exists", empty or not, before this is ever called. Whether
    // any accounts exist is the real signal.
    return (await this.#db.collection("users").countDocuments()) === 0;
  }

  async close(): Promise<void> {
    await this.#client.close();
  }
}

export async function openMongoStore(uri: string, dbName: string): Promise<Store> {
  const client = new MongoClient(uri);
  await client.connect();

  // `id` is this app's real primary key (see store.ts) — Mongo needs its own
  // index on it for `findById`/`find({id})` lookups to be fast and, per the
  // migration note in server/README.md, unique.
  const db = client.db(dbName);
  const collectionsNeedingIdIndex = [
    "users",
    "credentials",
    "sessions",
    "verificationCodes",
    "resetTokens",
    "auditLog",
    "googleAccounts",
    "googleMailer",
    "oauthStates",
    "availability",
    "bookings",
    "materials",
    "homework",
    "lessonNotes",
    "posts",
    "replies",
    "threads",
    "messages",
    "waitlist",
    "mail",
    "gameResults",
  ];
  await Promise.all(
    collectionsNeedingIdIndex.map((name) =>
      db.collection(name).createIndex({ id: 1 }, { unique: true }).catch(() => {
        // A pre-existing duplicate `id` (should not happen) would reject this;
        // leave the data alone rather than crash startup over an index.
      }),
    ),
  );

  return new MongoDbStore(client, dbName);
}
