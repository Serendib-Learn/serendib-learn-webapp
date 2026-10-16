import { Router } from "express";
import { db } from "../db/database.ts";
import { isBookableTutor } from "../lib/domain.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { nowIso } from "../lib/ids.ts";
import { requireAuth, requireUser } from "../lib/sessions.ts";

/**
 * Tutors' recordings for the alphabet sheet: one per letter or example word,
 * per language. Anyone can listen (the sheet is public); approved tutors and
 * administrators record, and a new recording replaces the old one.
 */
export const alphabetAudioRouter = Router();

/** A letter, or a word of up to a dozen letters, as code points: 0B95-0BCD. */
const KEY = /^[0-9A-F]{4,5}(-[0-9A-F]{4,5}){0,23}$/;
/** About 750 KB of audio — a few seconds is all a letter needs. */
const MAX_BASE64 = 1024 * 1024;

function parseTarget(language: string, key: string) {
  if (language !== "sinhala" && language !== "tamil") throw notFound("No such alphabet.");
  if (!KEY.test(key)) throw new ApiError("That is not a letter.");
  return { language: language as "sinhala" | "tamil", key, id: `${language}:${key}` };
}

/** Which letters have a recording, so the sheet knows what it can play. */
alphabetAudioRouter.get(
  "/",
  wrap(async (_request, response) => {
    const all = await db().alphabetAudio.find({});
    response.json(all.map((item) => ({ language: item.language, key: item.key, createdAt: item.createdAt })));
  }),
);

alphabetAudioRouter.get(
  "/:language/:key",
  wrap(async (request, response) => {
    const target = parseTarget(pathParam(request, "language"), pathParam(request, "key"));
    const audio = await db().alphabetAudio.findById(target.id);
    if (!audio) throw notFound("Nobody has recorded that one yet.");
    response.setHeader("Content-Type", audio.mimeType.split(";")[0]);
    response.setHeader("Cache-Control", "public, max-age=300");
    // Played by <audio> on the site's own (different) domain; helmet's
    // default same-origin policy would block that.
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.send(Buffer.from(audio.data, "base64"));
  }),
);

alphabetAudioRouter.put(
  "/:language/:key",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    if (actor.role !== "admin" && !isBookableTutor(actor)) {
      throw forbidden("Only our tutors and the team record the alphabet.");
    }
    const target = parseTarget(pathParam(request, "language"), pathParam(request, "key"));

    const mimeType = String(request.body?.mimeType ?? "");
    const data = String(request.body?.data ?? "");
    if (!/^audio\/[a-z0-9.+-]+(;\s*codecs=[a-z0-9.,"' +-]+)?$/i.test(mimeType)) {
      throw new ApiError("That is not an audio recording.");
    }
    if (!data || data.length > MAX_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      throw new ApiError("That recording is too long or did not come through. Keep it to a few seconds.");
    }

    await db().alphabetAudio.deleteOne({ id: target.id });
    await db().alphabetAudio.insertOne({ ...target, mimeType, data, recordedBy: actor.id, createdAt: nowIso() });
    response.status(204).end();
  }),
);

alphabetAudioRouter.delete(
  "/:language/:key",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const target = parseTarget(pathParam(request, "language"), pathParam(request, "key"));
    const audio = await db().alphabetAudio.findById(target.id);
    if (!audio) throw notFound("Nothing recorded there.");
    if (actor.role !== "admin" && audio.recordedBy !== actor.id) {
      throw forbidden("Only whoever recorded it, or the team, can remove it.");
    }
    await db().alphabetAudio.deleteOne({ id: target.id });
    response.status(204).end();
  }),
);
