import { Router } from "express";
import { db } from "../db/database.ts";
import { isListedTutor } from "../lib/domain.ts";
import { ApiError, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { requireAuth, requireSelfOrAdmin } from "../lib/sessions.ts";

/**
 * Tutors' photos for the public tutors page. Stored in the database like
 * every other upload here (`profilePhotos`, keyed by user id), and served
 * publicly only for tutors who are on that page.
 */
export const profilePhotosRouter = Router();

/** ~1.5 MB of image once decoded — the portal resizes before uploading. */
const MAX_PHOTO_BASE64 = 2 * 1024 * 1024;

/** The tutor themselves, or an administrator filling in their profile. */
profilePhotosRouter.put(
  "/:userId",
  requireAuth,
  wrap(async (request, response) => {
    const userId = pathParam(request, "userId");
    requireSelfOrAdmin(request, userId);
    const target = await db().users.findById(userId);
    if (!target) throw notFound("No such account.");
    if (target.role !== "tutor") throw new ApiError("Photos are for tutor profiles.");

    const mimeType = String(request.body?.mimeType ?? "");
    const data = String(request.body?.data ?? "");
    if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new ApiError("Photos can be JPEG, PNG or WebP.");
    if (!data || data.length > MAX_PHOTO_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      throw new ApiError("That photo is too large or did not come through. Try a smaller one.");
    }

    const existing = await db().profilePhotos.findById(userId);
    if (existing) {
      await db().profilePhotos.updateOne({ id: userId }, { mimeType, data, updatedAt: nowIso() });
    } else {
      await db().profilePhotos.insertOne({ id: userId, mimeType, data, updatedAt: nowIso() });
    }
    const updated = await db().users.updateOne({ id: userId }, { photoId: newId("ph") });
    response.json(updated);
  }),
);

profilePhotosRouter.delete(
  "/:userId",
  requireAuth,
  wrap(async (request, response) => {
    const userId = pathParam(request, "userId");
    requireSelfOrAdmin(request, userId);
    await db().profilePhotos.deleteOne({ id: userId });
    const updated = await db().users.updateOne({ id: userId }, { photoId: undefined });
    if (!updated) throw notFound("No such account.");
    response.json(updated);
  }),
);

/** Public, for tutors on the tutors page. Versioned by `?v=<photoId>`, so it caches well. */
profilePhotosRouter.get(
  "/:userId",
  wrap(async (request, response) => {
    const userId = pathParam(request, "userId");
    const user = await db().users.findById(userId);
    const photo = user && isListedTutor(user) ? await db().profilePhotos.findById(userId) : null;
    if (!photo) throw notFound("No photo.");
    response.setHeader("Content-Type", photo.mimeType);
    response.setHeader("Cache-Control", "public, max-age=86400");
    // Shown by <img> on the site's own (different) domain; helmet's default
    // same-origin policy would block that.
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.send(Buffer.from(photo.data, "base64"));
  }),
);
