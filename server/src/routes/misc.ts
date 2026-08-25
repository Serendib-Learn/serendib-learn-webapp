import { Router } from "express";
import { config } from "../config.ts";
import { db, reseed } from "../db/database.ts";
import { ApiError, forbidden, notFound, wrap } from "../lib/errors.ts";
import { pathParam } from "../lib/http.ts";
import { newId, normaliseEmail, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { requireAdmin, requireAuth, requireSelfOrAdmin, requireUser } from "../lib/sessions.ts";
import { requireTurnstile } from "../lib/turnstile.ts";
import type { GameResult, LanguageCode, WaitlistEntry } from "../../../shared/types.ts";

export const waitlistRouter = Router();
export const mailRouter = Router();
export const gamesRouter = Router();
export const demoRouter = Router();

const languages = ["sinhala", "tamil", "either"];
const levels = ["none", "some", "rusty", "fluent-ish"];

waitlistRouter.post(
  "/",
  wrap(async (request, response) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const email = normaliseEmail(String(body.email ?? ""));
    const name = String(body.name ?? "").trim();

    if (!name) throw new ApiError("We need a name.");
    if (!email.includes("@")) throw new ApiError("We need a working email address.");
    await requireTurnstile(
      body.turnstileToken ? String(body.turnstileToken) : undefined,
      request.ip,
    );

    const entry: WaitlistEntry = {
      id: newId("wl"),
      name,
      email,
      language: (languages.includes(String(body.language))
        ? body.language
        : "either") as WaitlistEntry["language"],
      level: (levels.includes(String(body.level))
        ? body.level
        : "none") as WaitlistEntry["level"],
      reason: String(body.reason ?? "").trim(),
      createdAt: nowIso(),
    };

    const created = await db().waitlist.insertOne(entry);

    await deliver({
      to: created.email,
      subject: "You're on the Serendib Learn list",
      body: `Thanks ${created.name}. We will write to you as soon as we have a tutor who fits.\n\nIn the meantime, the Survival Sri Lanka decks in Games are free and need no account.`,
      kind: "welcome",
    });

    response.status(201).json(created);
  }),
);

waitlistRouter.get(
  "/",
  requireAdmin,
  wrap(async (_request, response) => {
    response.json(
      await db().waitlist.find(
        {},
        { sort: (a, b) => b.createdAt.localeCompare(a.createdAt) },
      ),
    );
  }),
);

/**
 * The demo inbox. It has to be readable without a session, because the
 * verification code arrives before the account can log in — which also means
 * every message is visible to anyone who can reach the API. Demo only.
 */
function assertDemoMode() {
  if (!config.demoMode) throw forbidden("The demo inbox is switched off.");
}

mailRouter.get(
  "/",
  wrap(async (_request, response) => {
    assertDemoMode();
    response.json(
      await db().mail.find({}, { sort: (a, b) => b.sentAt.localeCompare(a.sentAt) }),
    );
  }),
);

mailRouter.post(
  "/:id/read",
  wrap(async (request, response) => {
    assertDemoMode();
    const updated = await db().mail.updateOne({ id: pathParam(request, "id") }, { read: true });
    if (!updated) throw notFound("No such message.");
    response.status(204).end();
  }),
);

mailRouter.delete(
  "/",
  wrap(async (_request, response) => {
    assertDemoMode();
    await db().mail.deleteMany({});
    response.status(204).end();
  }),
);

gamesRouter.get(
  "/results",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const userId = String(request.query.userId ?? actor.id);
    requireSelfOrAdmin(request, userId);

    response.json(
      await db().gameResults.find(
        { userId },
        { sort: (a, b) => b.completedAt.localeCompare(a.completedAt) },
      ),
    );
  }),
);

gamesRouter.post(
  "/results",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const body = (request.body ?? {}) as Record<string, unknown>;

    const chapterId = String(body.chapterId ?? "").trim();
    if (!chapterId) throw new ApiError("Which chapter?");

    const total = Math.max(0, Math.round(Number(body.total ?? 0)));
    const correct = Math.max(0, Math.min(total, Math.round(Number(body.correct ?? 0))));

    const result: GameResult = {
      id: newId("gr"),
      userId: actor.id,
      chapterId,
      script: (body.script === "tamil" ? "tamil" : "sinhala") as LanguageCode,
      correct,
      total,
      completedAt: nowIso(),
    };

    response.status(201).json(await db().gameResults.insertOne(result));
  }),
);

demoRouter.post(
  "/reset",
  wrap(async (_request, response) => {
    assertDemoMode();
    await reseed();
    response.status(204).end();
  }),
);
