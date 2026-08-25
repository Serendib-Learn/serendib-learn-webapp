import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { openMongoStore } from "./mongo-store.ts";
import type { Doc, Store } from "./store.ts";

interface TestDoc extends Doc {
  name: string;
  tags: string[];
  score: number;
}

let mongod: MongoMemoryServer;
let store: Store;

before(async () => {
  mongod = await MongoMemoryServer.create();
  store = await openMongoStore(mongod.getUri(), "mongo_store_test");
});

after(async () => {
  await (store as unknown as { close(): Promise<void> }).close();
  await mongod.stop();
});

test("isEmpty: true before anything is seeded", async () => {
  assert.equal(await store.isEmpty(), true);
});

test("insertOne: returns the doc, stores no _id leak on read-back", async () => {
  const col = store.collection<TestDoc>("things");
  const inserted = await col.insertOne({ id: "a", name: "Alpha", tags: ["x", "y"], score: 3 });

  assert.equal(inserted.name, "Alpha");
  assert.ok(!("_id" in (inserted as object)), "insertOne result must not leak _id");

  const found = await col.findById("a");
  assert.equal(found?.name, "Alpha");
  assert.ok(!("_id" in (found as object)), "findById result must not leak _id");
});

test("find: filter operators, array-contains, sort, and limit", async () => {
  const col = store.collection<TestDoc>("filter_things");
  await col.insertMany([
    { id: "a", name: "Alpha", tags: ["x", "y"], score: 3 },
    { id: "b", name: "Beta", tags: ["y", "z"], score: 5 },
    { id: "c", name: "Gamma", tags: ["z"], score: 1 },
  ]);

  assert.equal((await col.find()).length, 3);

  const gt = await col.find({ score: { $gt: 2 } });
  assert.equal(gt.length, 2);
  assert.ok(gt.every((doc) => doc.score > 2));

  const inOp = await col.find({ id: { $in: ["a", "c"] } });
  assert.equal(inOp.length, 2);

  const ne = await col.find({ id: { $ne: "a" } });
  assert.equal(ne.length, 2);
  assert.ok(!ne.some((doc) => doc.id === "a"));

  const containsY = await col.find({ tags: "y" });
  assert.equal(containsY.length, 2, "bare scalar against an array field means 'contains'");

  const sorted = await col.find({}, { sort: (x, y) => x.score - y.score });
  assert.deepEqual(
    sorted.map((doc) => doc.id),
    ["c", "a", "b"],
  );

  const limited = await col.find({}, { sort: (x, y) => x.score - y.score, limit: 2 });
  assert.equal(limited.length, 2);
  assert.equal(limited[0].id, "c");
});

test("updateOne/updateMany/deleteOne/deleteMany/count", async () => {
  const col = store.collection<TestDoc>("mutate_things");
  await col.insertMany([
    { id: "a", name: "Alpha", tags: ["x"], score: 1 },
    { id: "b", name: "Beta", tags: ["z"], score: 1 },
    { id: "c", name: "Gamma", tags: ["z"], score: 1 },
  ]);

  const updated = await col.updateOne({ id: "a" }, { score: 99 });
  assert.equal(updated?.score, 99);
  assert.ok(!("_id" in (updated as object)));
  assert.equal((await col.findById("a"))?.score, 99);

  const updatedCount = await col.updateMany({ tags: "z" }, { name: "renamed" });
  assert.equal(updatedCount, 2);
  assert.equal(await col.count({ name: "renamed" }), 2);

  assert.equal(await col.deleteOne({ id: "a" }), true);
  assert.equal(await col.findById("a"), null);

  assert.equal(await col.deleteMany({}), 2);
  assert.equal(await col.count(), 0);
});

test("replaceAll: repopulates named collections and isEmpty tracks the users collection", async () => {
  await store.replaceAll({
    users: [{ id: "u1", name: "Someone", tags: [], score: 0 } as TestDoc],
    other_things: [{ id: "x1", name: "Reseeded", tags: [], score: 0 } as TestDoc],
  });

  assert.equal(await store.isEmpty(), false);
  const others = await store.collection<TestDoc>("other_things").find();
  assert.equal(others.length, 1);
  assert.equal(others[0].id, "x1");
});
