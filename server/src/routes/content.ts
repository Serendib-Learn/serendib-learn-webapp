import { Router } from "express";
import { z, type ZodType } from "zod";
import { db } from "../db/database.ts";
import type { Collection } from "../db/store.ts";
import { logAudit } from "../lib/audit.ts";
import { isListedTutor } from "../lib/domain.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { nowIso } from "../lib/ids.ts";
import { requireAuth, requireUser } from "../lib/sessions.ts";
import { parseBody } from "../lib/validate.ts";
import type { ContentKind, ContentKinds, User } from "../../../shared/types.ts";

/**
 * Teaching content — phrase lists, alphabet sheets, holidays, course stage
 * descriptions and heritage sites — read and edited through one API, so no
 * screen hard-codes any of it:
 *
 *   GET    /api/content/:kind          everything of that kind (public)
 *   GET    /api/content/:kind/:id      one item (public)
 *   PUT    /api/content/:kind/:id      create (admins) or change (its editors)
 *   DELETE /api/content/:kind/:id      remove (admins)
 *
 * Reading is public because the alphabet sheet and the games are public
 * pages; none of it is personal. Every change is in the audit log.
 */
export const contentRouter = Router();

const text = (max: number, message = "This cannot be empty.") =>
  z.string({ error: message }).trim().min(1, message).max(max, `Keep it under ${max} characters.`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .optional()
    .transform((value) => value || undefined);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lower-case letters, numbers and dashes, like tuk-tuk-adventure.")
  .max(60);

const phraseSchema = z.object({
  english: text(200, "Each phrase needs its English."),
  sinhala: z.string().trim().max(200).default(""),
  sinhalaRoman: z.string().trim().max(200).default(""),
  tamil: z.string().trim().max(200).default(""),
  tamilRoman: z.string().trim().max(200).default(""),
  note: optionalText(400),
});

const letterSchema = z.object({
  letter: text(12, "Each letter needs its character."),
  roman: z.string().trim().max(24).default(""),
  sound: z.string().trim().max(200).default(""),
  ipa: z.string().trim().max(24).default(""),
  example: z
    .object({ word: z.string().trim().max(60), roman: z.string().trim().max(60), meaning: z.string().trim().max(120) })
    .optional()
    .transform((value) => (value && value.word ? value : undefined)),
});

type Editor = "admin" | "tutor";

interface Spec {
  /** Who can change an existing item. Creating and deleting is for administrators. */
  editors: Editor[];
  collection: () => Collection<ContentKinds[ContentKind]>;
  /** The body of a PUT: everything but `id` and the update stamps. */
  schema: ZodType;
  /** Checks the path id; returns a reason to refuse, if any. */
  validId: (id: string) => string | null;
  sort: (a: ContentKinds[ContentKind], b: ContentKinds[ContentKind]) => number;
  label: (doc: ContentKinds[ContentKind]) => string;
  /** Final touches before saving, e.g. numbering phrases. */
  prepare?: (doc: Record<string, unknown>) => Record<string, unknown>;
}

const specs: Record<ContentKind, Spec> = {
  "phrase-lists": {
    editors: ["admin", "tutor"],
    collection: () => db().phraseLists as unknown as ReturnType<Spec["collection"]>,
    schema: z.object({
      number: z.coerce.number().int().min(1).max(999),
      emoji: z.string().trim().max(8).default(""),
      title: text(80, "Give the list a title."),
      scene: z.string().trim().max(400).default(""),
      stage: text(60, "Which stage is it part of?"),
      phrases: z.array(phraseSchema).max(200, "Up to 200 phrases in a list."),
    }),
    validId: (id) => (slug.safeParse(id).success ? null : "Use a short id like tuk-tuk-adventure."),
    sort: (a, b) => {
      const x = a as ContentKinds["phrase-lists"];
      const y = b as ContentKinds["phrase-lists"];
      return x.stage.localeCompare(y.stage) || x.number - y.number;
    },
    label: (doc) => (doc as ContentKinds["phrase-lists"]).title,
    prepare: (doc) => ({
      ...doc,
      phrases: (doc.phrases as object[]).map((phrase, index) => ({ ...phrase, n: index + 1 })),
    }),
  },
  alphabet: {
    editors: ["admin", "tutor"],
    collection: () => db().alphabetSheets as unknown as ReturnType<Spec["collection"]>,
    schema: z.object({
      name: text(40),
      native: z.string().trim().max(60).default(""),
      intro: z.string().trim().max(2000).default(""),
      groups: z
        .array(
          z.object({
            title: text(80, "Each group needs a title."),
            native: optionalText(80),
            intro: z.string().trim().max(1000).default(""),
            letters: z.array(letterSchema).max(120),
          }),
        )
        .max(20),
      vowelSigns: z.object({
        base: z.string().trim().max(12).default(""),
        intro: z.string().trim().max(1000).default(""),
        signs: z.array(z.object({ form: text(12), roman: z.string().trim().max(24).default("") })).max(40),
      }),
      voiceLangs: z.array(z.string().trim().min(2).max(12)).max(6).default([]),
      status: z.enum(["draft", "reviewed"]),
    }),
    validId: (id) => (id === "sinhala" || id === "tamil" ? null : "Alphabet sheets are sinhala or tamil."),
    sort: (a, b) => a.id.localeCompare(b.id),
    label: (doc) => `${(doc as ContentKinds["alphabet"]).name} alphabet`,
  },
  holidays: {
    editors: ["admin"],
    collection: () => db().holidays as unknown as ReturnType<Spec["collection"]>,
    schema: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates look like 2027-01-14."),
      name: text(120, "Name the holiday."),
      category: z.enum(["poya", "national", "hindu", "muslim", "christian"]),
      funFact: z.string().trim().max(600).default(""),
    }),
    validId: (id) => (/^[a-z0-9_-]{3,100}$/.test(id) ? null : "That is not a holiday id."),
    sort: (a, b) => (a as ContentKinds["holidays"]).date.localeCompare((b as ContentKinds["holidays"]).date),
    label: (doc) => {
      const holiday = doc as ContentKinds["holidays"];
      return `${holiday.name} (${holiday.date})`;
    },
  },
  stages: {
    editors: ["admin"],
    collection: () => db().courseStages as unknown as ReturnType<Spec["collection"]>,
    schema: z.object({
      name: text(60, "Name the stage."),
      description: z.string().trim().max(400).default(""),
    }),
    validId: (id) => (slug.safeParse(id).success ? null : "Use a short id like survival-sri-lanka."),
    sort: (a, b) => (a as ContentKinds["stages"]).name.localeCompare((b as ContentKinds["stages"]).name),
    label: (doc) => (doc as ContentKinds["stages"]).name,
  },
  heritage: {
    editors: ["admin"],
    collection: () => db().heritageSites as unknown as ReturnType<Spec["collection"]>,
    schema: z.object({
      name: text(120),
      alsoKnownAs: optionalText(120),
      sinhala: optionalText(120),
      tamil: optionalText(120),
      region: z.enum(["Colombo", "Cultural Triangle", "Hill Country", "South Coast", "North", "East"]),
      era: z.string().trim().max(120).default(""),
      lat: z.coerce.number().min(5).max(10.5),
      lng: z.coerce.number().min(79).max(82.5),
      unesco: z.boolean().optional(),
      hook: z.string().trim().max(300).default(""),
      story: z.array(z.string().trim().min(1).max(2000)).max(20),
      facts: z.array(z.object({ label: text(60), value: text(300) })).max(20),
      meltingPot: optionalText(1000),
      pairedChapter: optionalText(60),
    }),
    validId: (id) => (slug.safeParse(id).success ? null : "Use a short id like galle-fort."),
    sort: (a, b) => (a as ContentKinds["heritage"]).name.localeCompare((b as ContentKinds["heritage"]).name),
    label: (doc) => (doc as ContentKinds["heritage"]).name,
  },
};

function specFor(kind: string): Spec {
  const spec = (specs as Record<string, Spec | undefined>)[kind];
  if (!spec) throw notFound("There is no content of that kind.");
  return spec;
}

/** Administrators always; approved tutors where the kind lets them. */
function mayEdit(user: User, spec: Spec): boolean {
  if (user.role === "admin") return true;
  return user.role === "tutor" && spec.editors.includes("tutor") && isListedTutor(user) && user.verified;
}

contentRouter.get(
  "/:kind",
  wrap(async (request, response) => {
    const spec = specFor(pathParam(request, "kind"));
    const all = await spec.collection().find({});
    response.setHeader("Cache-Control", "public, max-age=30");
    response.json(all.sort(spec.sort));
  }),
);

contentRouter.get(
  "/:kind/:id",
  wrap(async (request, response) => {
    const spec = specFor(pathParam(request, "kind"));
    const item = await spec.collection().findById(pathParam(request, "id"));
    if (!item) throw notFound("That has not been written yet.");
    response.setHeader("Cache-Control", "public, max-age=30");
    response.json(item);
  }),
);

contentRouter.put(
  "/:kind/:id",
  requireAuth,
  wrap(async (request, response) => {
    const kind = pathParam(request, "kind") as ContentKind;
    const spec = specFor(kind);
    const actor = requireUser(request);
    const id = pathParam(request, "id");

    if (!mayEdit(actor, spec)) {
      throw forbidden(
        spec.editors.includes("tutor")
          ? "Only approved tutors and administrators edit this."
          : "Only administrators edit this.",
      );
    }
    const badId = spec.validId(id);
    if (badId) throw new ApiError(badId);

    const existing = await spec.collection().findById(id);
    if (!existing && actor.role !== "admin") throw forbidden("Only administrators add new content.");

    const body = parseBody(spec.schema, request.body ?? {}) as Record<string, unknown>;
    const fields = {
      ...(spec.prepare ? spec.prepare(body) : body),
      updatedAt: nowIso(),
      updatedById: actor.id,
    };

    const saved = existing
      ? await spec.collection().updateOne({ id }, fields as Partial<ContentKinds[ContentKind]>)
      : await spec.collection().insertOne({ id, ...fields } as unknown as ContentKinds[ContentKind]);
    if (!saved) throw notFound("That has gone.");

    await logAudit(actor, existing ? "content_updated" : "content_added", spec.label(saved), kind);
    response.status(existing ? 200 : 201).json(saved);
  }),
);

contentRouter.delete(
  "/:kind/:id",
  requireAuth,
  wrap(async (request, response) => {
    const kind = pathParam(request, "kind") as ContentKind;
    const spec = specFor(kind);
    const actor = requireUser(request);
    if (actor.role !== "admin") throw forbidden("Only administrators remove content.");

    const id = pathParam(request, "id");
    const existing = await spec.collection().findById(id);
    if (!existing) throw notFound("That has already gone.");
    if (kind === "alphabet") throw new ApiError("The alphabet sheets can be edited but not removed.");

    await spec.collection().deleteOne({ id });
    // Chapters pointing at a removed phrase list just stop showing it.
    if (kind === "phrase-lists") {
      for (const chapter of await db().chapters.find({ vocabChapterId: id })) {
        await db().chapters.updateOne({ id: chapter.id }, { vocabChapterId: undefined });
      }
    }

    await logAudit(actor, "content_removed", spec.label(existing), kind);
    response.status(204).end();
  }),
);
