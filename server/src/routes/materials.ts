import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { requireUserRecord, teaches } from "../lib/domain.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import { parseBody } from "../lib/validate.ts";
import { z } from "zod";
import type {
  LanguageCode,
  Material,
  MaterialFeedback,
  MaterialFeedbackSummary,
  MaterialKind,
  User,
} from "../../../shared/types.ts";

export const materialsRouter = Router();

const newestFirst = (a: Material, b: Material) => b.createdAt.localeCompare(a.createdAt);

const kinds: MaterialKind[] = ["pdf", "audio", "video", "link", "deck"];
const levels: Material["level"][] = ["beginner", "intermediate", "advanced"];

/** Unassigned material is the open library, readable by anyone signed in. */
/**
 * Material goes to students only, and a tutor's only to their own students
 * (an administrator can assign anyone's material to anyone).
 */
async function assertMayAssign(actor: User, ownerId: string, studentIds: string[]) {
  for (const id of studentIds) {
    const student = await db().users.findById(id);
    if (student?.role !== "student") throw new ApiError("Material can only be assigned to students.");
    if (actor.role !== "admin" && !(await teaches(ownerId, id))) {
      throw forbidden("You can only assign material to your own students.");
    }
  }
}

materialsRouter.get(
  "/library",
  requireAuth,
  wrap(async (_request, response) => {
    const all = await db().materials.find({}, { sort: newestFirst });
    response.json(all.filter((material) => material.assignedTo.length === 0));
  }),
);

materialsRouter.get(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const studentId = request.query.studentId ? String(request.query.studentId) : null;
    const ownerId = request.query.ownerId ? String(request.query.ownerId) : null;

    if (studentId) {
      requireSelfOrAdmin(request, studentId);
      const all = await db().materials.find({ assignedTo: studentId }, { sort: newestFirst });
      response.json(all);
      return;
    }

    if (ownerId) {
      requireSelfOrAdmin(request, ownerId);
      response.json(await db().materials.find({ ownerId }, { sort: newestFirst }));
      return;
    }

    response.json(await db().materials.find({ ownerId: actor.id }, { sort: newestFirst }));
  }),
);

materialsRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const body = (request.body ?? {}) as Record<string, unknown>;

    const ownerId = String(body.ownerId ?? actor.id);
    requireSelfOrAdmin(request, ownerId);

    if (actor.role === "student") {
      throw forbidden("Only tutors and administrators add material.");
    }

    const title = String(body.title ?? "").trim();
    if (!title) throw new ApiError("Give the material a title.");

    const kind = kinds.includes(body.kind as MaterialKind)
      ? (body.kind as MaterialKind)
      : "pdf";
    const level = levels.includes(body.level as Material["level"])
      ? (body.level as Material["level"])
      : "beginner";
    const language =
      body.language === "both" || body.language === "tamil" || body.language === "sinhala"
        ? (body.language as LanguageCode | "both")
        : "both";

    const chapterId = body.chapterId ? String(body.chapterId) : undefined;
    if (chapterId && !(await db().chapters.findById(chapterId))) {
      throw new ApiError("That chapter does not exist.");
    }

    const assignedTo = Array.isArray(body.assignedTo)
      ? Array.from(new Set(body.assignedTo.map(String)))
      : [];
    await assertMayAssign(actor, ownerId, assignedTo);

    const material: Material = {
      id: newId("mat"),
      ownerId,
      title,
      description: String(body.description ?? "").trim(),
      kind,
      language,
      level,
      assignedTo,
      fileLabel: body.fileLabel ? String(body.fileLabel) : undefined,
      url: body.url ? String(body.url) : undefined,
      chapterId,
      createdAt: nowIso(),
    };

    const created = await db().materials.insertOne(material);
    const owner = await requireUserRecord(ownerId);

    for (const studentId of assignedTo) {
      const student = await db().users.findById(studentId);
      if (!student) continue;

      await deliver({
        to: student.email,
        subject: `${owner.name} added something to your learning hub`,
        body: `${created.title}\n\n${created.description}`,
        kind: "notification",
      });
    }

    response.status(201).json(created);
  }),
);

materialsRouter.post(
  "/:id/assign",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const material = await db().materials.findById(pathParam(request, "id"));
    if (!material) throw notFound("That material has gone.");

    if (material.ownerId !== actor.id && actor.role !== "admin") {
      throw forbidden("That material belongs to someone else.");
    }

    const studentIds: string[] = Array.isArray(request.body?.studentIds)
      ? Array.from(new Set(request.body.studentIds.map((value: unknown) => String(value))))
      : [];
    // Only newly added students need checking; keeping an existing one is fine.
    await assertMayAssign(
      actor,
      material.ownerId,
      studentIds.filter((id) => !material.assignedTo.includes(id)),
    );

    response.json(
      await db().materials.updateOne({ id: material.id }, { assignedTo: studentIds }),
    );
  }),
);

/** Files a material under a chapter, or (with no chapterId) unfiles it. */
materialsRouter.post(
  "/:id/chapter",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const material = await db().materials.findById(pathParam(request, "id"));
    if (!material) throw notFound("That material has gone.");
    if (material.ownerId !== actor.id && actor.role !== "admin") {
      throw forbidden("That material belongs to someone else.");
    }

    const chapterId = request.body?.chapterId ? String(request.body.chapterId) : undefined;
    if (chapterId && !(await db().chapters.findById(chapterId))) {
      throw new ApiError("That chapter does not exist.");
    }

    response.json(await db().materials.updateOne({ id: material.id }, { chapterId }));
  }),
);

materialsRouter.delete(
  "/:id",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const material = await db().materials.findById(pathParam(request, "id"));
    if (!material) throw notFound("That material has gone.");

    if (material.ownerId !== actor.id && actor.role !== "admin") {
      throw forbidden("That material belongs to someone else.");
    }

    await db().materials.deleteOne({ id: material.id });
    response.status(204).end();
  }),
);

/*
 * Feedback on materials. Students and tutors are asked different things —
 * see `MaterialFeedback` — and each person has one entry per material, which
 * they can change. The material's owner and administrators see all of it.
 */

/** Everything you have said about materials, so the hub can show "your rating". */
materialsRouter.get(
  "/feedback/mine",
  requireAuth,
  wrap(async (request, response) => {
    response.json(await db().materialFeedback.find({ authorId: requireUser(request).id }));
  }),
);

/** Count and average rating for each material you own (every material, for an administrator). */
materialsRouter.get(
  "/feedback/summary",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const owned =
      actor.role === "admin"
        ? await db().materials.find({})
        : await db().materials.find({ ownerId: actor.id });
    const ids = owned.map((material) => material.id);
    const all = ids.length ? await db().materialFeedback.find({ materialId: { $in: ids } }) : [];

    const summaries: MaterialFeedbackSummary[] = [];
    for (const id of ids) {
      const entries = all.filter((entry) => entry.materialId === id);
      if (entries.length === 0) continue;
      const average = entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length;
      summaries.push({ materialId: id, count: entries.length, average: Math.round(average * 10) / 10 });
    }
    response.json(summaries);
  }),
);

/** All the feedback on one material: for its owner and administrators. */
materialsRouter.get(
  "/:id/feedback",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const material = await db().materials.findById(pathParam(request, "id"));
    if (!material) throw notFound("That material has gone.");
    if (material.ownerId !== actor.id && actor.role !== "admin") {
      throw forbidden("Only the material's owner sees everyone's feedback.");
    }
    const entries = await db().materialFeedback.find(
      { materialId: material.id },
      { sort: (a: MaterialFeedback, b: MaterialFeedback) => b.updatedAt.localeCompare(a.updatedAt) },
    );
    response.json(entries);
  }),
);

const materialFeedbackSchema = z.object({
  rating: z.coerce
    .number({ error: "Give it a rating from 1 to 5." })
    .int()
    .min(1, "Give it a rating from 1 to 5.")
    .max(5, "Give it a rating from 1 to 5."),
  level: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
  suggestion: z.string().trim().max(1000, "Keep it under 1000 characters.").optional(),
  comment: z.string().trim().max(2000, "Keep it under 2000 characters.").default(""),
});

/**
 * Your feedback on a material you can see: a student on one assigned to
 * them or in the open library, a tutor on the library. Not your own material.
 */
materialsRouter.put(
  "/:id/feedback",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    if (actor.role !== "student" && actor.role !== "tutor") {
      throw forbidden("Feedback on materials comes from students and tutors.");
    }
    const material = await db().materials.findById(pathParam(request, "id"));
    if (!material) throw notFound("That material has gone.");
    if (material.ownerId === actor.id) throw new ApiError("That is your own material.");
    const visible = material.assignedTo.length === 0 || material.assignedTo.includes(actor.id);
    if (!visible) throw forbidden("That material has not been shared with you.");

    const input = parseBody(materialFeedbackSchema, request.body ?? {});
    const fields = {
      authorRole: actor.role,
      rating: input.rating,
      // Each role answers its own questions; anything else is dropped.
      level: actor.role === "student" ? input.level : undefined,
      suggestion: actor.role === "tutor" ? input.suggestion || undefined : undefined,
      comment: input.comment,
      updatedAt: nowIso(),
    } as const;

    const existing = await db().materialFeedback.findOne({ materialId: material.id, authorId: actor.id });
    if (existing) {
      response.json(await db().materialFeedback.updateOne({ id: existing.id }, fields));
      return;
    }
    const created = await db().materialFeedback.insertOne({
      id: newId("mf"),
      materialId: material.id,
      authorId: actor.id,
      createdAt: nowIso(),
      ...fields,
    });
    response.status(201).json(created);
  }),
);
