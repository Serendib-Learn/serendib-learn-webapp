import { Router } from "express";
import { db } from "../db/database.ts";
import { notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { progressFor, tuteeIdsOf } from "../lib/domain.ts";
import { requireAuth, requireSelfOrAdmin } from "../lib/sessions.ts";
import type { LessonNote, StudentProgress } from "../../../shared/types.ts";

export const progressRouter = Router();

const newestFirst = (a: LessonNote, b: LessonNote) => b.date.localeCompare(a.date);

progressRouter.get(
  "/lesson-notes",
  requireAuth,
  wrap(async (request, response) => {
    const studentId = String(request.query.studentId ?? "");
    const actor = requireSelfOrAdmin(request, studentId);

    const notes = await db().lessonNotes.find({ studentId }, { sort: newestFirst });
    // The tutor's engagement score is for the tutor and the team, not the student.
    response.json(
      actor.role === "admin" ? notes : notes.map((note) => ({ ...note, engagement: undefined })),
    );
  }),
);

/** Every tutee of a tutor, with their progress folded in. */
progressRouter.get(
  "/progress",
  requireAuth,
  wrap(async (request, response) => {
    const tutorId = String(request.query.tutorId ?? "");
    requireSelfOrAdmin(request, tutorId);

    const ids = await tuteeIdsOf(tutorId);
    const students = await db().users.find({ id: { $in: ids } });

    const progress: StudentProgress[] = [];
    for (const student of students) {
      progress.push(await progressFor(student));
    }

    progress.sort((a, b) => a.student.name.localeCompare(b.student.name));
    response.json(progress);
  }),
);

progressRouter.get(
  "/progress/:studentId",
  requireAuth,
  wrap(async (request, response) => {
    const studentId = pathParam(request, "studentId");
    const actor = request.user!;

    // A tutor may read the progress of anyone they teach.
    if (actor.id !== studentId && actor.role === "tutor") {
      const ids = await tuteeIdsOf(actor.id);
      if (!ids.includes(studentId)) requireSelfOrAdmin(request, studentId);
    } else if (actor.role !== "tutor") {
      requireSelfOrAdmin(request, studentId);
    }

    const student = await db().users.findById(studentId);
    if (!student) throw notFound("No such student.");

    response.json(await progressFor(student));
  }),
);
