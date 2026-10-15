import { Router } from "express";
import { db } from "../db/database.ts";
import { logAudit } from "../lib/audit.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAdmin, requireAuth, requireUser } from "../lib/sessions.ts";
import type { CommunityPost, PostKind, PostReply, PostStatus } from "../../../shared/types.ts";

export const communityRouter = Router();
export const postImagesRouter = Router();

const kinds: PostKind[] = ["story", "review", "idea", "photo"];

/** ~1.5 MB of image once decoded — plenty for a phone photo resized in the browser. */
const MAX_IMAGE_BASE64 = 2 * 1024 * 1024;

/** Upload a photo for a post you are about to write. Members only, like posting. */
postImagesRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    if (actor.role === "student" && actor.membership !== "active") {
      throw forbidden("Community posting is for members. Book a lesson to join in.");
    }
    const mimeType = String(request.body?.mimeType ?? "");
    const data = String(request.body?.data ?? "");
    if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new ApiError("Photos can be JPEG, PNG or WebP.");
    if (!data || data.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      throw new ApiError("That photo is too large or did not come through. Try a smaller one.");
    }
    const image = await db().postImages.insertOne({
      id: newId("img"),
      ownerId: actor.id,
      mimeType,
      data,
      createdAt: nowIso(),
    });
    response.status(201).json({ id: image.id });
  }),
);

/** Photos are for signed-in members, like the posts they belong to. */
postImagesRouter.get(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const image = await db().postImages.findById(pathParam(request, "id"));
    if (!image) throw notFound("That photo has gone.");
    response.setHeader("Content-Type", image.mimeType);
    response.setHeader("Cache-Control", "private, max-age=86400");
    response.send(Buffer.from(image.data, "base64"));
  }),
);

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

    if (!body) throw new ApiError("Write something to share first.");
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

    const kind = kinds.includes(request.body?.kind) ? (request.body.kind as PostKind) : "story";
    const imageId = request.body?.imageId ? String(request.body.imageId) : undefined;
    if (imageId) {
      const image = await db().postImages.findById(imageId);
      if (!image || image.ownerId !== actor.id) throw new ApiError("That photo is not yours to attach.");
    }

    const post: CommunityPost = {
      id: newId("po"),
      authorId: actor.id,
      kind,
      imageId,
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

    const actor = requireUser(request);
    const post = await db().posts.findById(pathParam(request, "id"));
    if (!post) throw notFound("That post has gone.");

    const note = request.body?.note ? String(request.body.note).trim() : undefined;
    const updated = await db().posts.updateOne(
      { id: post.id },
      { status, moderationNote: note },
    );

    await logAudit(actor, "post_moderated", post.title, `${status}${note ? `: ${note}` : ""}`);

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
