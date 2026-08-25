import { Router } from "express";
import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { ApiError, wrap } from "../lib/errors.ts";
import {
  exchangeGoogleCalendarCode,
  googleCalendarAuthUrl,
  googleCalendarEnabled,
} from "../lib/google.ts";
import { nowIso } from "../lib/ids.ts";
import { randomToken } from "../lib/passwords.ts";
import { requireAuth, requireUser } from "../lib/sessions.ts";
import type { GoogleCalendarStatus } from "../../../shared/types.ts";

export const integrationsRouter = Router();

/** How long a connect attempt has to finish before its state token expires. */
const STATE_TTL_MS = 10 * 60 * 1000;

integrationsRouter.get(
  "/google/status",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const linked = await db().googleAccounts.findById(actor.id);

    const status: GoogleCalendarStatus = linked
      ? { connected: true, email: linked.email }
      : { connected: false };

    response.json(status);
  }),
);

integrationsRouter.get(
  "/google/connect",
  requireAuth,
  wrap(async (request, response) => {
    if (!googleCalendarEnabled()) {
      throw new ApiError(
        "Google Calendar is not configured on this server.",
        503,
        "google_calendar_disabled",
      );
    }

    const actor = requireUser(request);
    const state = randomToken(24);
    await db().oauthStates.insertOne({ id: state, userId: actor.id, createdAt: nowIso() });

    response.redirect(googleCalendarAuthUrl(state));
  }),
);

/**
 * Google lands the browser here after the consent screen. There is no
 * session requirement — `state` is what proves which of our users this is,
 * since Google's redirect does not necessarily behave like a same-site
 * request. It is single-use and expires quickly either way.
 */
integrationsRouter.get(
  "/google/callback",
  wrap(async (request, response) => {
    const backTo = `${config.appUrl}/portal/calendar`;
    const state = String(request.query.state ?? "");
    const code = String(request.query.code ?? "");

    const pending = await db().oauthStates.findById(state);
    if (pending) await db().oauthStates.deleteOne({ id: state });

    if (request.query.error) {
      response.redirect(`${backTo}?google=cancelled`);
      return;
    }

    if (!pending || Date.now() - new Date(pending.createdAt).getTime() > STATE_TTL_MS) {
      response.redirect(`${backTo}?google=error`);
      return;
    }

    try {
      const link = await exchangeGoogleCalendarCode(code);

      await db().googleAccounts.deleteOne({ id: pending.userId });
      await db().googleAccounts.insertOne({
        id: pending.userId,
        refreshToken: link.refreshToken,
        email: link.email,
        connectedAt: nowIso(),
      });

      response.redirect(`${backTo}?google=connected`);
    } catch {
      response.redirect(`${backTo}?google=error`);
    }
  }),
);

integrationsRouter.post(
  "/google/disconnect",
  requireAuth,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    await db().googleAccounts.deleteOne({ id: actor.id });
    response.status(204).end();
  }),
);
