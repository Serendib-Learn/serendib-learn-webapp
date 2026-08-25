import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { tuteeIdsOf } from "../lib/domain.ts";
import { requireAdmin, requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import type {
  MembershipStatus,
  PublicProfile,
  Role,
  User,
} from "../../../shared/types.ts";

export const usersRouter = Router();

const byName = (a: User, b: User) => a.name.localeCompare(b.name);

/** Fields a user is allowed to change about themselves. */
const editable: (keyof User)[] = [
  "name",
  "timezone",
  "languages",
  "headline",
  "bio",
  "hourlyRateUsd",
  "yearsTeaching",
  "homeTown",
];

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
      })),
    );
  }),
);

usersRouter.get(
  "/tutors",
  wrap(async (_request, response) => {
    response.json(await db().users.find({ role: "tutor" }, { sort: byName }));
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
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const user = await db().users.findById(pathParam(request, "id"));
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

    response.json(await db().users.find({ id: { $in: ids } }, { sort: byName }));
  }),
);

usersRouter.patch(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    requireSelfOrAdmin(request, pathParam(request, "id"));

    const body = (request.body ?? {}) as Partial<User>;
    const patch: Partial<User> = {};
    for (const field of editable) {
      if (body[field] !== undefined) Object.assign(patch, { [field]: body[field] });
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

    const updated = await db().users.updateOne({ id: pathParam(request, "id") }, { role });
    if (!updated) throw notFound("No such account.");
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

    const updated = await db().users.updateOne({ id: pathParam(request, "id") }, { membership });
    if (!updated) throw notFound("No such account.");
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

    const removed = await db().users.deleteOne({ id });
    if (!removed) throw notFound("No such account.");

    await db().credentials.deleteOne({ id });
    await db().sessions.deleteMany({ userId: id });

    response.status(204).end();
  }),
);
