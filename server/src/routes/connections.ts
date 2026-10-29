import { Router } from "express";
import { db } from "../db/database.ts";
import { connectionBetween, isVetted } from "../lib/community.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { config } from "../config.ts";
import { requireAuth, requireUser } from "../lib/sessions.ts";
import type { CommunityMember, Connection, User } from "../../../shared/types.ts";

export const connectionsRouter = Router();

/** Plenty for real use; stops anyone from requesting the whole directory at once. */
const MAX_PENDING_OUTGOING = 25;

function member(user: User, viewerId: string, connection: Connection | null): CommunityMember {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatarId: user.avatarId,
    photoId: user.photoId,
    languages: user.languages,
    headline: user.headline,
    homeTown: user.homeTown,
    connection:
      connection && connection.status !== "declined"
        ? {
            id: connection.id,
            status: connection.status,
            direction: connection.requesterId === viewerId ? "outgoing" : "incoming",
          }
        : undefined,
  };
}

function requireVetted(user: User) {
  if (!isVetted(user)) {
    throw forbidden(
      "Practice partners open up once you have booked your first lesson — that is how we vet everyone here.",
    );
  }
}

/**
 * The practice partners directory: vetted fellow learners who have not opted
 * out, with how the viewer is connected to each. Learners only — tutors are
 * found on the tutors page.
 */
connectionsRouter.get(
  "/members",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    requireVetted(actor);

    const language = String(request.query.language ?? "");
    const students = await db().users.find({ role: "student" });
    const mine = [
      ...(await db().connections.find({ requesterId: actor.id })),
      ...(await db().connections.find({ addresseeId: actor.id })),
    ];

    const members = students
      .filter((user) => user.id !== actor.id && isVetted(user) && user.openToPractice !== false)
      .filter((user) => !language || user.languages.includes(language as User["languages"][number]))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((user) =>
        member(
          user,
          actor.id,
          mine.find((item) => item.requesterId === user.id || item.addresseeId === user.id) ?? null,
        ),
      );

    response.json(members);
  }),
);

/** Everyone the viewer is connected to or has a request open with. */
connectionsRouter.get(
  "/connections",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const mine = [
      ...(await db().connections.find({ requesterId: actor.id })),
      ...(await db().connections.find({ addresseeId: actor.id })),
    ].filter((item) => item.status !== "declined");

    const result: CommunityMember[] = [];
    for (const connection of mine) {
      const otherId = connection.requesterId === actor.id ? connection.addresseeId : connection.requesterId;
      const other = await db().users.findById(otherId);
      if (other) result.push(member(other, actor.id, connection));
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    response.json(result);
  }),
);

/** Sends a friend request — or accepts theirs, if they already asked. */
connectionsRouter.post(
  "/connections",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    requireVetted(actor);

    const otherId = String(request.body?.userId ?? "");
    if (!otherId || otherId === actor.id) throw new ApiError("Who would you like to connect with?");
    const other = await db().users.findById(otherId);
    if (!other || other.role !== "student" || !isVetted(other) || other.openToPractice === false) {
      throw notFound("That member is not in the practice partners directory.");
    }

    const existing = await connectionBetween(actor.id, other.id);
    if (existing?.status === "accepted") {
      response.json(existing);
      return;
    }
    if (existing?.status === "pending" && existing.requesterId === other.id) {
      // They asked first: asking back is saying yes.
      const accepted = await db().connections.updateOne(
        { id: existing.id },
        { status: "accepted", respondedAt: nowIso() },
      );
      response.json(accepted);
      return;
    }
    if (existing?.status === "pending") {
      response.json(existing);
      return;
    }

    const outgoing = await db().connections.find({ requesterId: actor.id, status: "pending" });
    if (outgoing.length >= MAX_PENDING_OUTGOING) {
      throw new ApiError("You have a lot of requests waiting already. Give people a little time to reply.");
    }

    // A declined request can be made again later, as a fresh one.
    if (existing) await db().connections.deleteOne({ id: existing.id });

    const created = await db().connections.insertOne({
      id: newId("cn"),
      requesterId: actor.id,
      addresseeId: other.id,
      status: "pending",
      createdAt: nowIso(),
    });

    await deliver({
      to: other.email,
      subject: `${actor.name} would like to practise with you`,
      body: `${actor.name} (learning ${actor.languages.join(" and ")}) sent you a practice partner request on Serendib Learn.\n\nAccept or decline it in the community: ${config.appUrl}/portal/community\n\nOnce you are friends you can message each other and arrange to practise.`,
      kind: "notification",
    });

    response.status(201).json(created);
  }),
);

async function respond(requestId: string, actor: User, status: "accepted" | "declined") {
  const connection = await db().connections.findById(requestId);
  if (!connection) throw notFound("That request has gone.");
  if (connection.addresseeId !== actor.id) throw forbidden("That request was not sent to you.");
  if (connection.status !== "pending") throw new ApiError("That request has already been answered.");
  return db().connections.updateOne({ id: connection.id }, { status, respondedAt: nowIso() });
}

connectionsRouter.post(
  "/connections/:id/accept",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const accepted = await respond(pathParam(request, "id"), actor, "accepted");

    const requester = accepted ? await db().users.findById(accepted.requesterId) : null;
    if (requester) {
      await deliver({
        to: requester.email,
        subject: `${actor.name} accepted your practice request`,
        body: `You and ${actor.name} are now practice partners. Send them a message to arrange a time: ${config.appUrl}/portal/messages?with=${actor.id}`,
        kind: "notification",
      });
    }
    response.json(accepted);
  }),
);

/** Declining is quiet: the other person is not told. */
connectionsRouter.post(
  "/connections/:id/decline",
  requireAuth,
  wrap(async (request, response) => {
    response.json(await respond(pathParam(request, "id"), requireUser(request), "declined"));
  }),
);

/** Cancels a request you sent, or removes a friend. */
connectionsRouter.delete(
  "/connections/:id",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const connection = await db().connections.findById(pathParam(request, "id"));
    if (!connection) throw notFound("That connection has gone.");
    if (connection.requesterId !== actor.id && connection.addresseeId !== actor.id) {
      throw forbidden("That connection is not yours.");
    }
    await db().connections.deleteOne({ id: connection.id });
    response.status(204).end();
  }),
);
