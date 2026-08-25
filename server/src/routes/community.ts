import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAdmin, requireAuth, requireUser } from "../lib/sessions.ts";
import type { CommunityPost, PostReply, PostStatus } from "../../../shared/types.ts";

export const communityRouter = Router();

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

communityRouter.get(
  "/",
  requireAuth,
  wrap(async (_request, response) => {
    response.json(await db().posts.find({ status: "approved" }, { sort: newestFirst }));
  }),
);

communityRouter.get(
  "/pending",
  requireAdmin,
  wrap(async (_request, response) => {
    response.json(await db().posts.find({ status: "pending" }, { sort: newestFirst }));
  }),
);

communityRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const title = String(request.body?.title ?? "").trim();
    const body = String(request.body?.body ?? "").trim();

    if (!title || !body) {
      throw new ApiError("A post needs both a title and something to say.");
    }
    if (actor.role === "student" && actor.membership !== "active") {
      throw forbidden("Community posting is for members. Book a lesson to join in.");
    }

    const tags = Array.isArray(request.body?.tags)
      ? Array.from(
          new Set(
            request.body.tags
              .map((tag: unknown) => String(tag).trim().replace(/^#/, "").toLowerCase())
              .filter(Boolean),
          ),
        ).slice(0, 6)
      : [];

    const post: CommunityPost = {
      id: newId("po"),
      authorId: actor.id,
      title,
      body,
      tags: tags as string[],
      status: "pending",
      createdAt: nowIso(),
      likedBy: [],
    };

    response.status(201).json(await db().posts.insertOne(post));
  }),
);

communityRouter.post(
  "/:id/like",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const post = await db().posts.findById(pathParam(request, "id"));
    if (!post) throw notFound("That post has gone.");

    const likedBy = post.likedBy.includes(actor.id)
      ? post.likedBy.filter((id) => id !== actor.id)
      : [...post.likedBy, actor.id];

    response.json(await db().posts.updateOne({ id: post.id }, { likedBy }));
  }),
);

communityRouter.get(
  "/:id/replies",
  requireAuth,
  wrap(async (request, response) => {
    response.json(
      await db().replies.find(
        { postId: pathParam(request, "id") },
        { sort: (a, b) => a.createdAt.localeCompare(b.createdAt) },
      ),
    );
  }),
);

communityRouter.post(
  "/:id/replies",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const post = await db().posts.findById(pathParam(request, "id"));
    if (!post) throw notFound("That post has gone.");
    if (post.status !== "approved") throw forbidden("That post is not published.");

    const body = String(request.body?.body ?? "").trim();
    if (!body) throw new ApiError("Write something first.");

    const reply: PostReply = {
      id: newId("rp"),
      postId: post.id,
      authorId: actor.id,
      body,
      createdAt: nowIso(),
    };

    response.status(201).json(await db().replies.insertOne(reply));
  }),
);

communityRouter.post(
  "/:id/moderate",
  requireAdmin,
  wrap(async (request, response) => {
    const status = request.body?.status as PostStatus;
    if (status !== "approved" && status !== "rejected") {
      throw new ApiError("A post is either approved or rejected.");
    }

    const post = await db().posts.findById(pathParam(request, "id"));
    if (!post) throw notFound("That post has gone.");

    const note = request.body?.note ? String(request.body.note).trim() : undefined;
    const updated = await db().posts.updateOne(
      { id: post.id },
      { status, moderationNote: note },
    );

    const author = await db().users.findById(post.authorId);
    if (author) {
      await deliver({
        to: author.email,
        subject:
          status === "approved"
            ? `Your post "${post.title}" is live`
            : `Your post "${post.title}" was not published`,
        body:
          status === "approved"
            ? "It is on the community page now."
            : (note ?? "It did not fit the community guidelines."),
        kind: "notification",
      });
    }

    response.json(updated);
  }),
);
