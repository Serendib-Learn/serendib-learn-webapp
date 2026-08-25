import fs from "node:fs/promises";
import path from "node:path";

/**
 * A small document store with a MongoDB-shaped surface, backed by one JSON file.
 *
 * The point of the shape is the migration: `Collection<T>` below covers the
 * operations this app actually performs, so moving to MongoDB means writing a
 * second implementation of `Collection` over the official driver and changing
 * `openStore` in one place. Nothing in `routes/` has to change.
 *
 * Documents are keyed by a string `id` rather than Mongo's `_id`. In MongoDB
 * that becomes a plain field with a unique index, which keeps the domain types
 * in `shared/types.ts` free of storage detail.
 */

export interface Doc {
  id: string;
}

/** Supported filter operators. A bare value means "equals". */
export interface Operators<V> {
  $in?: V[];
  $ne?: V;
  $gt?: V;
  $gte?: V;
  $lt?: V;
  $lte?: V;
  $exists?: boolean;
}

export type Filter<T> = {
  [K in keyof T]?: T[K] extends Array<infer Item>
    ? Item | T[K] | Operators<Item>
    : T[K] | Operators<T[K]>;
};

export interface FindOptions<T> {
  /** Comparator, applied after filtering. */
  sort?: (a: T, b: T) => number;
  limit?: number;
}

export interface Collection<T extends Doc> {
  find(filter?: Filter<T>, options?: FindOptions<T>): Promise<T[]>;
  findOne(filter: Filter<T>, options?: FindOptions<T>): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  insertOne(doc: T): Promise<T>;
  insertMany(docs: T[]): Promise<T[]>;
  /** Shallow patch of the first match, like `$set`. Returns the new document. */
  updateOne(filter: Filter<T>, changes: Partial<T>): Promise<T | null>;
  updateMany(filter: Filter<T>, changes: Partial<T>): Promise<number>;
  deleteOne(filter: Filter<T>): Promise<boolean>;
  deleteMany(filter: Filter<T>): Promise<number>;
  count(filter?: Filter<T>): Promise<number>;
}

export interface Store {
  collection<T extends Doc>(name: string): Collection<T>;
  /** Replaces every collection at once. Used by seeding and the demo reset. */
  replaceAll(contents: Record<string, Doc[]>): Promise<void>;
  /** Async because a real database has to ask, not just check memory. */
  isEmpty(): Promise<boolean>;
}

type Data = Record<string, Doc[]>;

function isOperators(value: unknown): value is Operators<unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => key.startsWith("$"));
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (isOperators(expected)) {
    const rules = expected as Operators<unknown>;

    if ("$exists" in rules && rules.$exists !== (actual !== undefined)) return false;
    if ("$in" in rules && rules.$in) {
      const wanted = rules.$in;
      const hit = Array.isArray(actual)
        ? actual.some((item) => wanted.includes(item))
        : wanted.includes(actual);
      if (!hit) return false;
    }
    if ("$ne" in rules && actual === rules.$ne) return false;
    if ("$gt" in rules && !(compare(actual, rules.$gt) > 0)) return false;
    if ("$gte" in rules && !(compare(actual, rules.$gte) >= 0)) return false;
    if ("$lt" in rules && !(compare(actual, rules.$lt) < 0)) return false;
    if ("$lte" in rules && !(compare(actual, rules.$lte) <= 0)) return false;

    return true;
  }

  // Mongo semantics: matching a scalar against an array field asks whether the
  // array contains it.
  if (Array.isArray(actual) && !Array.isArray(expected)) {
    return actual.includes(expected);
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  return actual === expected;
}

function matches<T extends Doc>(doc: T, filter: Filter<T>): boolean {
  return Object.entries(filter).every(([field, expected]) =>
    matchesValue((doc as Record<string, unknown>)[field], expected),
  );
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

class JsonStore implements Store {
  #data: Data;
  #file: string;
  /** Serialises writes so two requests cannot interleave a file write. */
  #writing: Promise<void> = Promise.resolve();

  constructor(file: string, data: Data) {
    this.#file = file;
    this.#data = data;
  }

  async isEmpty(): Promise<boolean> {
    return Object.keys(this.#data).length === 0;
  }

  rows(name: string): Doc[] {
    const existing = this.#data[name];
    if (existing) return existing;
    const created: Doc[] = [];
    this.#data[name] = created;
    return created;
  }

  collection<T extends Doc>(name: string): Collection<T> {
    return new JsonCollection<T>(this, name);
  }

  async replaceAll(contents: Record<string, Doc[]>): Promise<void> {
    this.#data = clone(contents) as Data;
    await this.flush();
  }

  /** Writes the whole file, atomically, one write at a time. */
  flush(): Promise<void> {
    this.#writing = this.#writing.then(async () => {
      const temporary = `${this.#file}.tmp`;
      await fs.mkdir(path.dirname(this.#file), { recursive: true });
      await fs.writeFile(temporary, JSON.stringify(this.#data, null, 2), "utf8");
      await fs.rename(temporary, this.#file);
    });

    return this.#writing;
  }
}

class JsonCollection<T extends Doc> implements Collection<T> {
  #store: JsonStore;
  #name: string;

  constructor(store: JsonStore, name: string) {
    this.#store = store;
    this.#name = name;
  }

  #rows(): T[] {
    return this.#store.rows(this.#name) as T[];
  }

  async find(filter: Filter<T> = {}, options: FindOptions<T> = {}): Promise<T[]> {
    let found = this.#rows().filter((doc) => matches(doc, filter));
    if (options.sort) found = found.slice().sort(options.sort);
    if (options.limit !== undefined) found = found.slice(0, options.limit);
    return clone(found);
  }

  async findOne(filter: Filter<T>, options: FindOptions<T> = {}): Promise<T | null> {
    const [first] = await this.find(filter, { ...options, limit: 1 });
    return first ?? null;
  }

  async findById(id: string): Promise<T | null> {
    return this.findOne({ id } as Filter<T>);
  }

  async insertOne(doc: T): Promise<T> {
    this.#rows().push(clone(doc));
    await this.#store.flush();
    return clone(doc);
  }

  async insertMany(docs: T[]): Promise<T[]> {
    this.#rows().push(...clone(docs));
    await this.#store.flush();
    return clone(docs);
  }

  async updateOne(filter: Filter<T>, changes: Partial<T>): Promise<T | null> {
    const target = this.#rows().find((doc) => matches(doc, filter));
    if (!target) return null;

    Object.assign(target, clone(changes));
    await this.#store.flush();
    return clone(target);
  }

  async updateMany(filter: Filter<T>, changes: Partial<T>): Promise<number> {
    const targets = this.#rows().filter((doc) => matches(doc, filter));
    for (const target of targets) Object.assign(target, clone(changes));
    if (targets.length > 0) await this.#store.flush();
    return targets.length;
  }

  async deleteOne(filter: Filter<T>): Promise<boolean> {
    const rows = this.#rows();
    const index = rows.findIndex((doc) => matches(doc, filter));
    if (index === -1) return false;

    rows.splice(index, 1);
    await this.#store.flush();
    return true;
  }

  async deleteMany(filter: Filter<T>): Promise<number> {
    const rows = this.#rows();
    const keep = rows.filter((doc) => !matches(doc, filter));
    const removed = rows.length - keep.length;
    if (removed > 0) {
      rows.splice(0, rows.length, ...keep);
      await this.#store.flush();
    }
    return removed;
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    return this.#rows().filter((doc) => matches(doc, filter)).length;
  }
}

/** Reads the file if it exists, otherwise starts empty so the caller can seed. */
export async function openStore(file: string): Promise<Store> {
  let data: Data = {};

  try {
    const raw = await fs.readFile(file, "utf8");
    data = JSON.parse(raw) as Data;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw new Error(
        `Could not read the data file at ${file}. Move it aside to start fresh. (${String(error)})`,
      );
    }
  }

  return new JsonStore(file, data);
}
