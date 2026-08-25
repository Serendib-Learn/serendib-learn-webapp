import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { requireUserRecord } from "../lib/domain.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { requireAuth, requireUser } from "../lib/sessions.ts";
import type { Message, Thread, ThreadSummary, User } from "../../../shared/types.ts";

export const messagesRouter = Router();

const bySentAt = (a: Message, b: Message) => a.sentAt.localeCompare(b.sentAt);

async function threadFor(id: string, actor: User): Promise<Thread> {
  const thread = await db().threads.findById(id);
  if (!thread) throw notFound("That conversation has gone.");
  if (!thread.participantIds.includes(actor.id) && actor.role !== "admin") {
    throw forbidden("That conversation is not yours.");
  }
  return thread;
}

messagesRouter.get(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const threads = await db().threads.find({ participantIds: actor.id });
    const summaries: ThreadSummary[] = [];

    for (const thread of threads) {
      const otherId = thread.participantIds.find((id) => id !== actor.id);
      const other = otherId ? await db().users.findById(otherId) : null;
      if (!other) continue;

      const messages = await db().messages.find({ threadId: thread.id }, { sort: bySentAt });

      summaries.push({
        thread,
        other,
        lastMessage: messages[messages.length - 1],
        unread: messages.filter(
          (message) => message.senderId !== actor.id && !message.readBy.includes(actor.id),
        ).length,
      });
    }

    summaries.sort((a, b) =>
      (b.lastMessage?.sentAt ?? "").localeCompare(a.lastMessage?.sentAt ?? ""),
    );

    response.json(summaries);
  }),
);

/** Idempotent: returns the existing conversation when there is one. */
messagesRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const otherId = String(request.body?.userId ?? "");

    if (!otherId || otherId === actor.id) throw new ApiError("Who do you want to talk to?");
    await requireUserRecord(otherId);

    const mine = await db().threads.find({ participantIds: actor.id });
    const existing = mine.find((thread) => thread.participantIds.includes(otherId));
    if (existing) {
      response.json(existing);
      return;
    }

    const thread: Thread = {
      id: newId("th"),
      participantIds: [actor.id, otherId],
      createdAt: nowIso(),
    };

    response.status(201).json(await db().threads.insertOne(thread));
  }),
);

messagesRouter.get(
  "/:id/messages",
  requireAuth,
  wrap(async (request, response) => {
    const thread = await threadFor(pathParam(request, "id"), requireUser(request));
    response.json(await db().messages.find({ threadId: thread.id }, { sort: bySentAt }));
  }),
);

messagesRouter.post(
  "/:id/messages",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const thread = await threadFor(pathParam(request, "id"), actor);

    const body = String(request.body?.body ?? "").trim();
    if (!body) throw new ApiError("Nothing to send.");

    const message: Message = {
      id: newId("ms"),
      threadId: thread.id,
      senderId: actor.id,
      body,
      sentAt: nowIso(),
      readBy: [actor.id],
    };

    response.status(201).json(await db().messages.insertOne(message));
  }),
);

messagesRouter.post(
  "/:id/read",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const thread = await threadFor(pathParam(request, "id"), actor);

    const messages = await db().messages.find({ threadId: thread.id });
    for (const message of messages) {
      if (message.readBy.includes(actor.id)) continue;
      await db().messages.updateOne(
        { id: message.id },
        { readBy: [...message.readBy, actor.id] },
      );
    }

    response.status(204).end();
  }),
);
