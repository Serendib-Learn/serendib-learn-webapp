import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { adminClient, latestMail, signedUpUser } from "../test-support/accounts.ts";
import { startTestServer } from "../test-support/harness.ts";
import type { PublicTutor, User } from "../../../shared/types.ts";

let harness: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  harness = await startTestServer();
});

after(async () => {
  await harness.close();
});

test("tutor signup: pending until an admin approves, and unbookable until then", async () => {
  const tutor = await signedUpUser(harness, "tutor", "applicant@example.com", {
    approve: false,
    extra: { application: { headline: "Kandy Sinhala", homeTown: "Kandy", yearsTeaching: 4 } },
  });
  assert.equal(tutor.user.tutorStatus, "pending");
  assert.equal(tutor.user.homeTown, "Kandy");
  assert.equal(tutor.user.yearsTeaching, 4);

  const notice = await latestMail(harness, "admin@serendiblearn.com", "notification");
  assert.match(notice?.subject ?? "", /New tutor application/);

  const listed = await harness.client().get("/users/tutors");
  assert.ok(!(listed.body as PublicTutor[]).some((item) => item.id === tutor.user.id));

  const student = await signedUpUser(harness, "student", "keen-student@example.com");
  const refused = await student.client.post("/bookings", {
    tutorId: tutor.user.id,
    startsAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
    durationMins: 60,
    language: "sinhala",
    focus: "Anything",
  });
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /not taking bookings/);

  // Only an admin can decide.
  const selfApprove = await tutor.client.post(`/users/${tutor.user.id}/tutor-status`, {
    status: "approved",
  });
  assert.equal(selfApprove.status, 403);

  const admin = await adminClient(harness);
  const approved = await admin.client.post(`/users/${tutor.user.id}/tutor-status`, {
    status: "approved",
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.tutorStatus, "approved");

  const relisted = await harness.client().get("/users/tutors");
  assert.ok((relisted.body as PublicTutor[]).some((item) => item.id === tutor.user.id));
});

test("public tutor list never carries email addresses or account flags", async () => {
  const { body } = await harness.client().get("/users/tutors");
  assert.ok((body as PublicTutor[]).length > 0);
  for (const tutor of body as Record<string, unknown>[]) {
    assert.equal(tutor.email, undefined);
    assert.equal(tutor.googleId, undefined);
    assert.equal(tutor.superAdmin, undefined);
  }
});

test("invite: admin creates an account and a set-password link goes out", async () => {
  const admin = await adminClient(harness);
  const invited = await admin.client.post("/users/invite", {
    name: "Real Tutor",
    email: "real.tutor@example.com",
    role: "tutor",
    languages: ["tamil"],
  });
  assert.equal(invited.status, 201);
  assert.equal(invited.body.tutorStatus, "approved");
  assert.equal(invited.body.verified, true);

  const mail = await latestMail(harness, "real.tutor@example.com", "password_reset");
  assert.ok(mail?.token);
  assert.match(mail.body, /http:\/\/localhost:3000\/portal\/reset-password\?token=/);

  const client = harness.client();
  const reset = await client.post("/auth/reset-password", {
    token: mail.token,
    password: "a-new-password",
  });
  assert.equal(reset.status, 200);
  assert.equal(reset.body.user.email, "real.tutor@example.com");

  const duplicate = await admin.client.post("/users/invite", {
    name: "Again",
    email: "real.tutor@example.com",
    role: "student",
    languages: ["tamil"],
  });
  assert.equal(duplicate.status, 400);

  const student = await signedUpUser(harness, "student", "not-an-admin@example.com");
  const forbidden = await student.client.post("/users/invite", {
    name: "Sneaky",
    email: "sneaky@example.com",
    role: "admin",
    languages: ["tamil"],
  });
  assert.equal(forbidden.status, 403);
});

test("super admin: cannot be demoted or deleted from the admin area", async () => {
  const admin = await adminClient(harness);
  assert.equal(admin.user.superAdmin, true);

  // A second, ordinary administrator tries to remove the owners.
  const second = await signedUpUser(harness, "student", "second-admin@example.com");
  const promoted = await admin.client.post(`/users/${second.user.id}/role`, { role: "admin" });
  assert.equal(promoted.status, 200);

  const demote = await second.client.post(`/users/${admin.user.id}/role`, { role: "student" });
  assert.equal(demote.status, 403);

  const remove = await second.client.delete(`/users/${admin.user.id}`);
  assert.equal(remove.status, 403);
});

test("profile patch: validated, and limited to profile fields", async () => {
  const tutor = await signedUpUser(harness, "tutor", "profile-tutor@example.com");

  const ok = await tutor.client.patch(`/users/${tutor.user.id}`, {
    headline: "Spoken Sinhala first",
    specialties: ["Heritage learners", "Kids"],
    hourlyRateUsd: 30,
    role: "admin",
    tutorStatus: "approved",
  });
  assert.equal(ok.status, 200);
  const updated = ok.body as User;
  assert.deepEqual(updated.specialties, ["Heritage learners", "Kids"]);
  assert.equal(updated.hourlyRateUsd, 30);
  assert.equal(updated.role, "tutor", "role is not a profile field");

  const bad = await tutor.client.patch(`/users/${tutor.user.id}`, { languages: [] });
  assert.equal(bad.status, 400);
});

test("avatars: only the shared characters are accepted, at signup and on the profile", async () => {
  const student = await signedUpUser(harness, "student", "leopard-fan@example.com", {
    extra: { avatarId: "kotiya" },
  });
  assert.equal(student.user.avatarId, "kotiya");

  const changed = await student.client.patch(`/users/${student.user.id}`, { avatarId: "aliya" });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.avatarId, "aliya");

  const madeUp = await student.client.patch(`/users/${student.user.id}`, { avatarId: "dragon" });
  assert.equal(madeUp.status, 400);

  const directory = await student.client.get("/users/directory");
  const me = (directory.body as { id: string; avatarId?: string }[]).find(
    (person) => person.id === student.user.id,
  );
  assert.equal(me?.avatarId, "aliya");
});

test("tutor listed without an email: on the tutors page, not bookable, until the invite goes out", async () => {
  const admin = await adminClient(harness);

  const studentWithout = await admin.client.post("/users/invite", {
    name: "No Address",
    role: "student",
    languages: ["tamil"],
  });
  assert.equal(studentWithout.status, 400);

  const listed = await admin.client.post("/users/invite", {
    name: "Listed Tutor",
    email: "",
    role: "tutor",
    languages: ["tamil"],
  });
  assert.equal(listed.status, 201);
  const tutor = listed.body as User;
  assert.equal(tutor.email, "");
  assert.equal(tutor.verified, false);
  assert.equal(tutor.tutorStatus, "approved");

  const profile = await admin.client.patch(`/users/${tutor.id}`, { bio: "Teaches Tamil in Jaffna." });
  assert.equal(profile.status, 200);

  const roster = (await harness.client().get("/users/tutors")).body as PublicTutor[];
  const card = roster.find((item) => item.id === tutor.id);
  assert.ok(card);
  assert.equal(card.bookable, false);
  assert.equal(card.bio, "Teaches Tamil in Jaffna.");

  const student = await signedUpUser(harness, "student", "eager@example.com");
  const refused = await student.client.post("/bookings", {
    tutorId: tutor.id,
    startsAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
    durationMins: 60,
    language: "tamil",
    focus: "Anything",
  });
  assert.equal(refused.status, 400);

  // An empty address never matches anything at the front door.
  const forgot = await harness.client().post("/auth/forgot-password", { email: "" });
  assert.equal(forgot.status, 400);

  const bad = await admin.client.post(`/users/${tutor.id}/email`, { email: "not-an-email" });
  assert.equal(bad.status, 400);
  const taken = await admin.client.post(`/users/${tutor.id}/email`, { email: "eager@example.com" });
  assert.equal(taken.status, 400);
  const notAdmin = await student.client.post(`/users/${tutor.id}/email`, { email: "x@example.com" });
  assert.equal(notAdmin.status, 403);

  const added = await admin.client.post(`/users/${tutor.id}/email`, { email: "Listed.Tutor@Example.com" });
  assert.equal(added.status, 200);
  assert.equal(added.body.email, "listed.tutor@example.com");
  assert.equal(added.body.verified, true);
  const invite = await latestMail(harness, "listed.tutor@example.com", "password_reset");
  assert.ok(invite?.token);

  const again = await admin.client.post(`/users/${tutor.id}/email`, { email: "other@example.com" });
  assert.equal(again.status, 400);

  const relisted = (await harness.client().get("/users/tutors")).body as PublicTutor[];
  assert.equal(relisted.find((item) => item.id === tutor.id)?.bookable, true);
});

test("profile photos: anyone's own; tutors' public, everyone else's only by current version", async () => {
  const admin = await adminClient(harness);
  const tutor = await signedUpUser(harness, "tutor", "photogenic@example.com");
  const student = await signedUpUser(harness, "student", "camera-shy@example.com");
  // A 1×1 transparent PNG.
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const put = (who: { client: { put: (p: string, b: unknown) => Promise<{ status: number; body: { photoId?: string } }> } }, id: string, mimeType = "image/png") =>
    who.client.put(`/profile-photos/${id}`, { mimeType, data: png });
  const serve = (id: string, version?: string) =>
    fetch(`${harness.baseUrl}/profile-photos/${id}${version ? `?v=${version}` : ""}`);

  assert.equal((await harness.client().put(`/profile-photos/${tutor.user.id}`, { mimeType: "image/png", data: png })).status, 401);
  assert.equal((await put(student, tutor.user.id)).status, 403);
  assert.equal((await put(tutor, tutor.user.id, "image/gif")).status, 400);

  // Tutors: public, versioned or not; the versioned URL is cached for a year.
  const uploaded = await put(tutor, tutor.user.id);
  assert.equal(uploaded.status, 200);
  const version = uploaded.body.photoId!;
  assert.ok(version.length >= 16, "the version is long enough to act as a private link");
  assert.equal((await serve(tutor.user.id)).status, 200);
  const versioned = await serve(tutor.user.id, version);
  assert.equal(versioned.status, 200);
  assert.equal(versioned.headers.get("content-type"), "image/png");
  assert.equal(versioned.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(versioned.headers.get("cross-origin-resource-policy"), "cross-origin");
  const roster = (await harness.client().get("/users/tutors")).body as PublicTutor[];
  assert.equal(roster.find((item) => item.id === tutor.user.id)?.photoId, version);

  // Students can have one too — served only with the current version.
  const mine = await put(student, student.user.id);
  assert.equal(mine.status, 200);
  assert.equal((await serve(student.user.id)).status, 404);
  assert.equal((await serve(student.user.id, "ph_guess")).status, 404);
  assert.equal((await serve(student.user.id, mine.body.photoId)).status, 200);
  // Members see the version wherever they see the person.
  const directory = (await tutor.client.get("/users/directory")).body as { id: string; photoId?: string }[];
  assert.equal(directory.find((item) => item.id === student.user.id)?.photoId, mine.body.photoId);

  // A replacement is a new version; the old link stops working for a student.
  const replaced = await put(admin, student.user.id);
  assert.equal(replaced.status, 200);
  assert.notEqual(replaced.body.photoId, mine.body.photoId);
  assert.equal((await serve(student.user.id, mine.body.photoId)).status, 404);

  const removed = await tutor.client.delete(`/profile-photos/${tutor.user.id}`);
  assert.equal(removed.status, 200);
  assert.equal(removed.body.photoId, undefined);
  assert.equal((await serve(tutor.user.id)).status, 404);
});

test("any email domain signs up; unverified login says so; an admin can confirm the address", async () => {
  const client = harness.client();
  const email = "learner.lk@yahoo.com";
  const signup = await client.post("/auth/signup", {
    name: "Yahoo Learner",
    email,
    password: "password123",
    role: "student",
    languages: ["sinhala"],
  });
  assert.equal(signup.status, 201);

  const early = await client.post("/auth/login", { email, password: "password123" });
  assert.equal(early.status, 403);
  assert.equal(early.body.code, "not_verified");

  const admin = await adminClient(harness);
  const user = ((await admin.client.get("/users")).body as User[]).find((item) => item.email === email)!;
  const student = await signedUpUser(harness, "student", "not-staff@example.com");
  assert.equal((await student.client.post(`/users/${user.id}/verify`)).status, 403);

  const confirmed = await admin.client.post(`/users/${user.id}/verify`);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.verified, true);
  const welcome = await latestMail(harness, email, "welcome");
  assert.match(welcome?.body ?? "", /log in now/);

  const login = await client.post("/auth/login", { email, password: "password123" });
  assert.equal(login.status, 200);
});
