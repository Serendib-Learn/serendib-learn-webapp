import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { requireUserRecord } from "../lib/domain.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import type { LanguageCode, Material, MaterialKind } from "../../../shared/types.ts";

export const materialsRouter = Router();

const newestFirst = (a: Material, b: Material) => b.createdAt.localeCompare(a.createdAt);

const kinds: MaterialKind[] = ["pdf", "audio", "video", "link", "deck"];
const levels: Material["level"][] = ["beginner", "intermediate", "advanced"];

/** Unassigned material is the open library, readable by anyone signed in. */
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

    const assignedTo = Array.isArray(body.assignedTo)
      ? Array.from(new Set(body.assignedTo.map(String)))
      : [];

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

    response.json(
      await db().materials.updateOne({ id: material.id }, { assignedTo: studentIds }),
    );
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
