import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { requireUserRecord } from "../lib/domain.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import type { HomeworkItem } from "../../../shared/types.ts";

export const homeworkRouter = Router();

const byDue = (a: HomeworkItem, b: HomeworkItem) => a.dueAt.localeCompare(b.dueAt);

homeworkRouter.get(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const studentId = request.query.studentId ? String(request.query.studentId) : null;
    const tutorId = request.query.tutorId ? String(request.query.tutorId) : null;

    if (studentId) {
      requireSelfOrAdmin(request, studentId);
      response.json(await db().homework.find({ studentId }, { sort: byDue }));
      return;
    }

    if (tutorId) {
      requireSelfOrAdmin(request, tutorId);
      response.json(await db().homework.find({ tutorId }, { sort: byDue }));
      return;
    }

    const field = actor.role === "student" ? "studentId" : "tutorId";
    response.json(await db().homework.find({ [field]: actor.id }, { sort: byDue }));
  }),
);

homeworkRouter.post(
  "/",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const body = (request.body ?? {}) as Record<string, unknown>;

    const tutorId = String(body.tutorId ?? actor.id);
    requireSelfOrAdmin(request, tutorId);

    if (actor.role === "student") throw forbidden("Only tutors set homework.");

    const title = String(body.title ?? "").trim();
    const studentId = String(body.studentId ?? "");
    const dueAt = new Date(String(body.dueAt ?? ""));

    if (!title) throw new ApiError("Give the task a title.");
    if (!studentId) throw new ApiError("Which student is this for?");
    if (Number.isNaN(dueAt.getTime())) throw new ApiError("That due date is not a date.");

    const student = await requireUserRecord(studentId);
    const tutor = await requireUserRecord(tutorId);

    const item: HomeworkItem = {
      id: newId("hw"),
      studentId,
      tutorId,
      title,
      brief: String(body.brief ?? "").trim(),
      dueAt: dueAt.toISOString(),
      status: "assigned",
      createdAt: nowIso(),
    };

    const created = await db().homework.insertOne(item);

    await deliver({
      to: student.email,
      subject: `New homework from ${tutor.name}`,
      body: `${created.title}\n\n${created.brief}\n\nDue ${dueAt.toLocaleString()}`,
      kind: "notification",
    });

    response.status(201).json(created);
  }),
);

homeworkRouter.post(
  "/:id/submit",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const item = await db().homework.findById(pathParam(request, "id"));
    if (!item) throw notFound("That task has gone.");

    if (item.studentId !== actor.id && actor.role !== "admin") {
      throw forbidden("That task belongs to another student.");
    }

    const note = String(request.body?.note ?? "").trim();
    if (!note) throw new ApiError("Add a note for your tutor before sending.");

    const updated = await db().homework.updateOne(
      { id: item.id },
      { status: "submitted", submittedAt: nowIso(), submissionNote: note },
    );

    const tutor = await db().users.findById(item.tutorId);
    if (tutor) {
      await deliver({
        to: tutor.email,
        subject: `${actor.name} submitted "${item.title}"`,
        body: `${note}\n\nMark it in the portal when you have a moment.`,
        kind: "notification",
      });
    }

    response.json(updated);
  }),
);

homeworkRouter.post(
  "/:id/review",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const item = await db().homework.findById(pathParam(request, "id"));
    if (!item) throw notFound("That task has gone.");

    if (item.tutorId !== actor.id && actor.role !== "admin") {
      throw forbidden("Only the tutor who set this can mark it.");
    }

    const feedback = String(request.body?.feedback ?? "").trim();
    if (!feedback) throw new ApiError("Write some feedback first.");

    const raw = Number(request.body?.score ?? 0);
    const score = Math.max(0, Math.min(100, Math.round(Number.isNaN(raw) ? 0 : raw)));

    const updated = await db().homework.updateOne(
      { id: item.id },
      { status: "reviewed", feedback, score },
    );

    const student = await db().users.findById(item.studentId);
    if (student) {
      await deliver({
        to: student.email,
        subject: `Feedback on "${item.title}"`,
        body: `${feedback}\n\nScore: ${score}/100`,
        kind: "notification",
      });
    }

    response.json(updated);
  }),
);
