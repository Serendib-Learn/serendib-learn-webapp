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

test("profile photos: tutors only, public on the tutors page, replaced and removed", async () => {
  const admin = await adminClient(harness);
  const tutor = await signedUpUser(harness, "tutor", "photogenic@example.com");
  const student = await signedUpUser(harness, "student", "camera-shy@example.com");
  // A 1×1 transparent PNG.
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  assert.equal((await harness.client().put(`/profile-photos/${tutor.user.id}`, { mimeType: "image/png", data: png })).status, 401);
  assert.equal((await student.client.put(`/profile-photos/${tutor.user.id}`, { mimeType: "image/png", data: png })).status, 403);
  assert.equal((await student.client.put(`/profile-photos/${student.user.id}`, { mimeType: "image/png", data: png })).status, 400);
  assert.equal((await tutor.client.put(`/profile-photos/${tutor.user.id}`, { mimeType: "image/gif", data: png })).status, 400);

  const uploaded = await tutor.client.put(`/profile-photos/${tutor.user.id}`, { mimeType: "image/png", data: png });
  assert.equal(uploaded.status, 200);
  const firstVersion = uploaded.body.photoId as string;
  assert.ok(firstVersion);

  const served = await fetch(`${harness.baseUrl}/profile-photos/${tutor.user.id}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.equal(served.headers.get("cross-origin-resource-policy"), "cross-origin");

  const roster = (await harness.client().get("/users/tutors")).body as PublicTutor[];
  assert.equal(roster.find((item) => item.id === tutor.user.id)?.photoId, firstVersion);

  // An administrator can replace it; the version changes so caches refetch.
  const replaced = await admin.client.put(`/profile-photos/${tutor.user.id}`, { mimeType: "image/png", data: png });
  assert.equal(replaced.status, 200);
  assert.notEqual(replaced.body.photoId, firstVersion);

  const removed = await tutor.client.delete(`/profile-photos/${tutor.user.id}`);
  assert.equal(removed.status, 200);
  assert.equal(removed.body.photoId, undefined);
  assert.equal((await fetch(`${harness.baseUrl}/profile-photos/${tutor.user.id}`)).status, 404);
});
