import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startTestServer } from "../test-support/harness.ts";

// A production-shaped boot: no demo data, owners' account from the environment.
let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer({
    DEMO_MODE: "false",
    SUPER_ADMIN_EMAIL: "Owners@SerendibLearn.com",
    SUPER_ADMIN_NAME: "The Owners",
    SUPER_ADMIN_PASSWORD: "owners-password",
  });
});

after(async () => {
  await harness.close();
});

test("DEMO_MODE=false: the demo accounts are never seeded", async () => {
  const login = await harness.client().post("/auth/login", {
    email: "admin@serendiblearn.com",
    password: "serendib",
  });
  assert.equal(login.status, 401);

  const tutors = await harness.client().get("/users/tutors");
  assert.deepEqual(tutors.body, []);
});

test("SUPER_ADMIN_EMAIL: the owners' account exists, is a super admin, and can log in", async () => {
  const login = await harness.client().post("/auth/login", {
    email: "owners@serendiblearn.com",
    password: "owners-password",
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "admin");
  assert.equal(login.body.user.superAdmin, true);
  assert.equal(login.body.user.name, "The Owners");
});
