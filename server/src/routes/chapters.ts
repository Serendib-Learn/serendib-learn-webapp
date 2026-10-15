import { Router } from "express";
import { z } from "zod";
import { db } from "../db/database.ts";
import { logAudit } from "../lib/audit.ts";
import { notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { requireAdmin, requireAuth, requireUser } from "../lib/sessions.ts";
import { parseBody } from "../lib/validate.ts";
import type { CourseChapter } from "../../../shared/types.ts";

export const chaptersRouter = Router();

const inOrder = (a: CourseChapter, b: CourseChapter) => a.order - b.order;

const chapterSchema = z.object({
  stage: z.string({ error: "Which stage is it in?" }).trim().min(1, "Which stage is it in?").max(60),
  title: z.string({ error: "Give the chapter a title." }).trim().min(1, "Give the chapter a title.").max(80),
  summary: z.string().trim().max(300).default(""),
  order: z.coerce.number().int().min(0).max(100_000),
  vocabChapterId: z.string().trim().max(60).optional(),
});

/** The course outline, in order. Anyone signed in. */
chaptersRouter.get(
  "/",
  requireAuth,
  wrap(async (_request, response) => {
    response.json(await db().chapters.find({}, { sort: inOrder }));
  }),
);

chaptersRouter.post(
  "/",
  requireAdmin,
  wrap(async (request, response) => {
    const input = parseBody(chapterSchema, request.body);
    const chapter = await db().chapters.insertOne({ id: newId("ch"), ...input, createdAt: nowIso() });
    await logAudit(requireUser(request), "chapter_added", chapter.title, chapter.stage);
    response.status(201).json(chapter);
  }),
);

chaptersRouter.patch(
  "/:id",
  requireAdmin,
  wrap(async (request, response) => {
    const input = parseBody(chapterSchema.partial(), request.body);
    const updated = await db().chapters.updateOne({ id: pathParam(request, "id") }, input);
    if (!updated) throw notFound("No such chapter.");
    response.json(updated);
  }),
);

/** Removes a chapter. Its materials stay, unfiled, rather than disappearing with it. */
chaptersRouter.delete(
  "/:id",
  requireAdmin,
  wrap(async (request, response) => {
    const id = pathParam(request, "id");
    const chapter = await db().chapters.findById(id);
    if (!chapter) throw notFound("No such chapter.");

    for (const material of await db().materials.find({ chapterId: id })) {
      await db().materials.updateOne({ id: material.id }, { chapterId: undefined });
    }
    await db().chapters.deleteOne({ id });
    await logAudit(requireUser(request), "chapter_removed", chapter.title, chapter.stage);
    response.status(204).end();
  }),
);
