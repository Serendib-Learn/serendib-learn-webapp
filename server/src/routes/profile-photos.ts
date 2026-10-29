import { Router } from "express";
import { db } from "../db/database.ts";
import { isListedTutor } from "../lib/domain.ts";
import { ApiError, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { nowIso } from "../lib/ids.ts";
import { randomToken } from "../lib/passwords.ts";
import { requireAuth, requireSelfOrAdmin } from "../lib/sessions.ts";

/**
 * Profile photos — anyone's, shown instead of their character across the
 * portal, and a tutor's on the public tutors page. Stored in the database
 * (`profilePhotos`, keyed by user id) and served at
 * /api/profile-photos/:userId?v=<photoId>:
 *
 *   - a listed tutor's photo is public, with or without the version;
 *   - anyone else's is served only with their *current* version — an
 *     unguessable value only signed-in members are sent — so it works in an
 *     <img> (and through the site's image CDN) without a cookie, yet nobody
 *     can browse members' photos by id.
 *
 * A versioned URL never changes content (a new upload is a new version), so
 * it is cached for a year; the site's image optimiser resizes it and keeps it
 * at the edge, which is what makes photos load quickly.
 */
export const profilePhotosRouter = Router();

/** ~1.5 MB of image once decoded — the portal resizes before uploading. */
const MAX_PHOTO_BASE64 = 2 * 1024 * 1024;

/** Your own photo, or — for an administrator — anyone's. */
profilePhotosRouter.put(
  "/:userId",
  requireAuth,
  wrap(async (request, response) => {
    const userId = pathParam(request, "userId");
    requireSelfOrAdmin(request, userId);
    const target = await db().users.findById(userId);
    if (!target) throw notFound("No such account.");

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
    const updated = await db().users.updateOne({ id: userId }, { photoId: `ph_${randomToken(12)}` });
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

/** See the note at the top: public for listed tutors, by current version for everyone else. */
profilePhotosRouter.get(
  "/:userId",
  wrap(async (request, response) => {
    const userId = pathParam(request, "userId");
    const user = await db().users.findById(userId);
    const version = request.query.v ? String(request.query.v) : "";
    const current = Boolean(user?.photoId) && version === user?.photoId;
    const allowed = Boolean(user) && (isListedTutor(user!) || current);
    const photo = allowed ? await db().profilePhotos.findById(userId) : null;
    if (!photo) throw notFound("No photo.");
    response.setHeader("Content-Type", photo.mimeType);
    // A versioned URL's content never changes; an unversioned one might.
    response.setHeader(
      "Cache-Control",
      current ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    );
    // Shown by <img> on the site's own (different) domain; helmet's default
    // same-origin policy would block that.
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.send(Buffer.from(photo.data, "base64"));
  }),
);
