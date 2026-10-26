import { Router } from "express";
import { z } from "zod";
import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { sendInvite } from "../lib/accounts.ts";
import { logAudit } from "../lib/audit.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { isListedTutor, publicTutor, teaches, tuteeIdsOf } from "../lib/domain.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAdmin, requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import { parseBody } from "../lib/validate.ts";
import { characterIds } from "../../../shared/avatars.ts";
import type {
  AuditLogEntry,
  MembershipStatus,
  PublicProfile,
  Role,
  TutorStatus,
  User,
} from "../../../shared/types.ts";

export const usersRouter = Router();

const byName = (a: User, b: User) => a.name.localeCompare(b.name);

/** Fields a user is allowed to change about themselves, and what each must look like. */
const profilePatchSchema = z
  .object({
    name: z.string().trim().min(1, "A name cannot be empty.").max(80),
    timezone: z.string().trim().min(1).max(64),
    languages: z.array(z.enum(["sinhala", "tamil"])).min(1, "Pick at least one language."),
    headline: z.string().trim().max(140, "Keep the headline under 140 characters."),
    bio: z.string().trim().max(2000, "Keep the bio under 2000 characters."),
    hourlyRateUsd: z.coerce.number().min(5, "Rates start at $5 an hour.").max(500),
    yearsTeaching: z.coerce.number().int().min(0).max(70),
    homeTown: z.string().trim().max(80),
    specialties: z.array(z.string().trim().min(1).max(40)).max(8, "Up to eight specialties."),
    avatarId: z.enum(characterIds as [string, ...string[]], { error: "That is not one of the characters." }),
    openToPractice: z.boolean(),
  })
  .partial();

const emailSchema = z
  .string({ error: "That does not look like an email address." })
  .trim()
  .toLowerCase()
  .pipe(z.email("That does not look like an email address."));

const inviteSchema = z
  .object({
    name: z
      .string({ error: "We need a name to put on the account." })
      .trim()
      .min(1, "We need a name to put on the account."),
    // Blank is allowed for a tutor: listed now, invited once we have the address.
    email: z.preprocess((value) => (value === "" ? undefined : value), emailSchema.optional()),
    role: z.enum(["student", "tutor", "admin"]),
    languages: z.array(z.enum(["sinhala", "tamil"])).min(1, "Pick at least one language."),
    timezone: z.string().trim().min(1).default("Asia/Colombo"),
  })
  .refine((input) => input.email || input.role === "tutor", {
    message: "Students and administrators need an email address to sign in with.",
  });

/** The owners' account is out of reach of the admin area — see `User.superAdmin`. */
function assertNotSuperAdmin(target: User | null, what: string) {
  if (target?.superAdmin) {
    throw forbidden(`A super admin account cannot be ${what} from here.`);
  }
}

/** Names only, so the portal can label bookings, posts and replies. */
usersRouter.get(
  "/directory",
  requireAuth,
  wrap(async (_request, response) => {
    const everyone = await db().users.find({}, { sort: byName });

    response.json(
      everyone.map<PublicProfile>((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        headline: user.headline,
        avatarId: user.avatarId,
      })),
    );
  }),
);

/** Public: approved tutors only, without contact details. */
usersRouter.get(
  "/tutors",
  wrap(async (_request, response) => {
    const tutors = await db().users.find({ role: "tutor" }, { sort: byName });
    response.json(tutors.filter(isListedTutor).map(publicTutor));
  }),
);

/**
 * An administrator creating an account on someone's behalf — bringing an
 * existing tutor onto the site, or adding another administrator. The person
 * is emailed a link to choose their own password. A tutor can be added with
 * no email address yet: their profile goes on the tutors page straight away,
 * and `POST /:id/email` sends the invite once the address is known.
 */
usersRouter.post(
  "/invite",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const input = parseBody(inviteSchema, request.body);

    if (input.email && (await db().users.findOne({ email: input.email }))) {
      throw new ApiError("An account with that email already exists.");
    }

    const user: User = {
      id: newId("u"),
      name: input.name,
      email: input.email ?? "",
      role: input.role,
      // Verified once there is an address, which the invite link proves.
      verified: Boolean(input.email),
      membership: input.role === "student" ? "none" : "active",
      createdAt: nowIso(),
      timezone: input.timezone,
      languages: input.languages,
      // An administrator adding a tutor is the approval.
      ...(input.role === "tutor" ? { tutorStatus: "approved" as const } : {}),
    };

    const created = await db().users.insertOne(user);
    if (created.email) {
      await sendInvite(created, actor.name);
      await logAudit(actor, "account_invited", created.name, `${created.role} · ${created.email}`);
    } else {
      await logAudit(actor, "tutor_listed", created.name, "no email yet");
    }

    response.status(201).json(created);
  }),
);

/**
 * Confirms someone's email address for them — when the code never reached
 * them (mail not set up yet, or caught by a spam filter) and they have
 * confirmed who they are some other way.
 */
usersRouter.post(
  "/:id/verify",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const target = await db().users.findById(pathParam(request, "id"));
    if (!target) throw notFound("No such account.");
    if (!target.email) throw new ApiError("Add an email address to that account first.");
    if (target.verified) {
      response.json(target);
      return;
    }

    const updated = await db().users.updateOne({ id: target.id }, { verified: true });
    if (!updated) throw notFound("No such account.");
    await db().verificationCodes.deleteOne({ id: target.email });
    await logAudit(actor, "email_verified", updated.name, updated.email);
    await deliver({
      to: updated.email,
      subject: "Your Serendib Learn account is ready",
      body: `We have confirmed your email address, so you can log in now: ${config.appUrl}/portal/login`,
      kind: "welcome",
    });

    response.json(updated);
  }),
);

/**
 * Gives an account listed without an email address its address, and sends
 * the invite to set a password. From then on it is an ordinary account — and,
 * for a tutor, bookable.
 */
usersRouter.post(
  "/:id/email",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const email = parseBody(z.object({ email: emailSchema }), request.body ?? {}).email;

    const target = await db().users.findById(pathParam(request, "id"));
    if (!target) throw notFound("No such account.");
    if (target.email) throw new ApiError("That account already has an email address.");
    if (await db().users.findOne({ email })) {
      throw new ApiError("An account with that email already exists.");
    }

    const updated = await db().users.updateOne({ id: target.id }, { email, verified: true });
    if (!updated) throw notFound("No such account.");
    await sendInvite(updated, actor.name);
    await logAudit(actor, "account_invited", updated.name, `${updated.role} · ${email}`);

    response.json(updated);
  }),
);

usersRouter.get(
  "/",
  requireAdmin,
  wrap(async (_request, response) => {
    response.json(await db().users.find({}, { sort: byName }));
  }),
);

usersRouter.get(
  "/audit-log",
  requireAdmin,
  wrap(async (_request, response) => {
    response.json(
      await db().auditLog.find(
        {},
        { sort: (a: AuditLogEntry, b: AuditLogEntry) => b.createdAt.localeCompare(a.createdAt), limit: 200 },
      ),
    );
  }),
);

/**
 * A whole account record, email included: your own, any for an
 * administrator, or one of a tutor's own students. Everyone else gets names
 * from /directory and tutors from /tutors.
 */
usersRouter.get(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const id = pathParam(request, "id");
    const allowed =
      actor.id === id ||
      actor.role === "admin" ||
      (actor.role === "tutor" && (await teaches(actor.id, id)));
    if (!allowed) throw forbidden("That is somebody else's account.");

    const user = await db().users.findById(id);
    if (!user) throw notFound("No such account.");
    response.json(user);
  }),
);

usersRouter.get(
  "/:id/tutees",
  requireAuth,
  wrap(async (request, response) => {
    requireSelfOrAdmin(request, pathParam(request, "id"));

    const ids = await tuteeIdsOf(pathParam(request, "id"));
    response.json(await db().users.find({ id: { $in: ids } }, { sort: byName }));
  }),
);

usersRouter.get(
  "/:id/tutors",
  requireAuth,
  wrap(async (request, response) => {
    requireSelfOrAdmin(request, pathParam(request, "id"));

    const bookings = await db().bookings.find({ studentId: pathParam(request, "id") });
    const ids = Array.from(
      new Set(
        bookings
          .filter((booking) => booking.status !== "cancelled")
          .map((booking) => booking.tutorId),
      ),
    );

    // Their public profiles: a student talks to tutors through the portal.
    const tutors = await db().users.find({ id: { $in: ids } }, { sort: byName });
    response.json(tutors.map(publicTutor));
  }),
);

usersRouter.patch(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    requireSelfOrAdmin(request, pathParam(request, "id"));

    const patch: Partial<User> = parseBody(profilePatchSchema, request.body ?? {});

    // Rate, experience and specialties describe a tutor's teaching; on any
    // other account they would only be misleading.
    const target = await db().users.findById(pathParam(request, "id"));
    if (!target) throw notFound("No such account.");
    const tutorOnly = (["hourlyRateUsd", "yearsTeaching", "specialties"] as const).filter(
      (field) => patch[field] !== undefined,
    );
    if (target.role !== "tutor" && tutorOnly.length > 0) {
      throw new ApiError("Rates, years teaching and specialties are only for tutor profiles.");
    }

    const updated = await db().users.updateOne({ id: pathParam(request, "id") }, patch);
    if (!updated) throw notFound("No such account.");
    response.json(updated);
  }),
);

usersRouter.post(
  "/:id/role",
  requireAdmin,
  wrap(async (request, response) => {
    const role = request.body?.role as Role;
    if (role !== "student" && role !== "tutor" && role !== "admin") {
      throw new ApiError("That is not a role.");
    }

    const actor = requireUser(request);
    if (actor.id === pathParam(request, "id")) {
      throw forbidden("Change your own role from another administrator's account.");
    }

    const target = await db().users.findById(pathParam(request, "id"));
    assertNotSuperAdmin(target, "demoted");

    // Making someone a tutor from the admin area is itself the approval.
    const patch: Partial<User> = role === "tutor" ? { role, tutorStatus: "approved" } : { role };
    const updated = await db().users.updateOne({ id: pathParam(request, "id") }, patch);
    if (!updated) throw notFound("No such account.");

    await logAudit(actor, "role_change", target?.name ?? updated.id, `${target?.role} → ${role}`);
    response.json(updated);
  }),
);

/** Approve or turn down a tutor's application. */
usersRouter.post(
  "/:id/tutor-status",
  requireAdmin,
  wrap(async (request, response) => {
    const status = String(request.body?.status ?? "") as TutorStatus;
    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      throw new ApiError("A tutor is approved, rejected or pending.");
    }
    const note = request.body?.note ? String(request.body.note).trim() : "";

    const actor = requireUser(request);
    const target = await db().users.findById(pathParam(request, "id"));
    if (!target) throw notFound("No such account.");
    if (target.role !== "tutor") throw new ApiError("That account is not a tutor.");

    const updated = await db().users.updateOne({ id: target.id }, { tutorStatus: status });
    if (!updated) throw notFound("No such account.");

    await logAudit(
      actor,
      "tutor_review",
      target.name,
      `${target.tutorStatus ?? "approved"} → ${status}${note ? `: ${note}` : ""}`,
    );

    if (status === "approved") {
      await deliver({
        to: target.email,
        subject: "You're approved to teach on Serendib Learn",
        body: "Good news — your tutor application has been approved and students can now find and book you.\n\nMake sure your profile and hours are up to date in the portal: Profile, and Calendar → My hours.",
        kind: "notification",
      });
    } else if (status === "rejected") {
      await deliver({
        to: target.email,
        subject: "About your Serendib Learn tutor application",
        body: note || "Thank you for applying to teach with Serendib Learn. We are not able to take your application forward at the moment.",
        kind: "notification",
      });
    }

    response.json(updated);
  }),
);

usersRouter.post(
  "/:id/membership",
  requireAdmin,
  wrap(async (request, response) => {
    const membership = request.body?.membership as MembershipStatus;
    if (membership !== "none" && membership !== "active") {
      throw new ApiError("Membership is either none or active.");
    }

    const actor = requireUser(request);
    const target = await db().users.findById(pathParam(request, "id"));
    const updated = await db().users.updateOne({ id: pathParam(request, "id") }, { membership });
    if (!updated) throw notFound("No such account.");

    await logAudit(
      actor,
      "membership_change",
      target?.name ?? updated.id,
      `${target?.membership} → ${membership}`,
    );
    response.json(updated);
  }),
);

usersRouter.delete(
  "/:id",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const id = pathParam(request, "id");

    if (actor.id === id) throw forbidden("You cannot delete your own account here.");

    const target = await db().users.findById(id);
    assertNotSuperAdmin(target, "deleted");
    const removed = await db().users.deleteOne({ id });
    if (!removed) throw notFound("No such account.");

    await db().credentials.deleteOne({ id });
    await db().sessions.deleteMany({ userId: id });
    await logAudit(actor, "account_deleted", target?.name ?? id, target?.email);

    response.status(204).end();
  }),
);
