import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startTestServer } from "../test-support/harness.ts";

// The real limits, not the scaled-up ones the other test files use.
let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer({ RATE_LIMIT_SCALE: "1" });
});

after(async () => {
  await harness.close();
});

test("checking the session never counts against the auth limit; login attempts do", async () => {
  const client = harness.client();
  for (let index = 0; index < 40; index += 1) {
    const me = await client.get("/auth/me");
    assert.equal(me.status, 200, `GET /auth/me #${index + 1} should never be rate limited`);
  }

  const statuses: number[] = [];
  for (let index = 0; index < 22; index += 1) {
    const attempt = await client.post("/auth/login", { email: "nobody@example.com", password: "wrong" });
    statuses.push(attempt.status);
  }
  assert.equal(statuses[0], 401);
  assert.equal(statuses.at(-1), 429, "the 21st failed login in the window is refused");
});
