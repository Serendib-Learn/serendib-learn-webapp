import { Router, type Request, type Response } from "express";
import { config } from "../config.ts";
import { db, SYSTEM_CALENDAR_ID } from "../db/database.ts";
import { ApiError, wrap } from "../lib/errors.ts";
import {
  createGoogleMeeting,
  deleteGoogleMeeting,
  exchangeGoogleAuthCode,
  googleCalendarAuthUrl,
  googleCalendarEnabled,
  googleMailAuthUrl,
  sendGmail,
} from "../lib/google.ts";
import { nowIso } from "../lib/ids.ts";
import { randomToken } from "../lib/passwords.ts";
import { requireAdmin, requireAuth, requireUser } from "../lib/sessions.ts";
import type { GoogleCalendarStatus } from "../../../shared/types.ts";

export const integrationsRouter = Router();

/**
 * Hands over Google's consent screen. The portal asks with ?format=json, in
 * the background, and then sends the browser to Google itself: a browser
 * that keeps the API's cookie for background requests only (Brave, Safari,
 * Chrome with third-party cookies off — the site and the API are different
 * domains) would arrive here logged out if it navigated to this URL. A plain
 * visit still gets the redirect.
 */
function sendToGoogle(request: Request, response: Response, url: string) {
  if (request.query.format === "json") response.json({ url });
  else response.redirect(url);
}

/** How long a connect attempt has to finish before its state token expires. */
const STATE_TTL_MS = 10 * 60 * 1000;

/** Where the browser lands back on the portal once a purpose's flow finishes. */
const RETURN_PATH: Record<"calendar" | "mail" | "system-calendar", string> = {
  calendar: "/portal/calendar",
  mail: "/portal/admin",
  "system-calendar": "/portal/admin",
};

function requireGoogleConfigured() {
  if (!googleCalendarEnabled()) {
    throw new ApiError(
      "This Google connection is not configured on this server.",
      503,
      "google_disabled",
    );
  }
}

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
    requireGoogleConfigured();

    const actor = requireUser(request);
    const state = randomToken(24);
    await db().oauthStates.insertOne({
      id: state,
      userId: actor.id,
      purpose: "calendar",
      createdAt: nowIso(),
    });

    sendToGoogle(request, response, googleCalendarAuthUrl(state));
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

integrationsRouter.get(
  "/google/mail/status",
  requireAdmin,
  wrap(async (_request, response) => {
    const linked = await db().googleMailer.findById("system");

    const status: GoogleCalendarStatus = linked
      ? { connected: true, email: linked.email }
      : { connected: false };

    response.json(status);
  }),
);

integrationsRouter.get(
  "/google/mail/connect",
  requireAdmin,
  wrap(async (request, response) => {
    requireGoogleConfigured();

    const actor = requireUser(request);
    const state = randomToken(24);
    await db().oauthStates.insertOne({
      id: state,
      userId: actor.id,
      purpose: "mail",
      createdAt: nowIso(),
    });

    sendToGoogle(request, response, googleMailAuthUrl(state));
  }),
);

integrationsRouter.post(
  "/google/mail/disconnect",
  requireAdmin,
  wrap(async (_request, response) => {
    await db().googleMailer.deleteOne({ id: "system" });
    response.status(204).end();
  }),
);

/**
 * The site's shared Serendib calendar: admin-only, one fixed row. Bookings
 * with a tutor who has not connected their own calendar get their Meet link
 * from this one instead.
 */
integrationsRouter.get(
  "/google/system-calendar/status",
  requireAdmin,
  wrap(async (_request, response) => {
    const linked = await db().googleAccounts.findById(SYSTEM_CALENDAR_ID);
    const status: GoogleCalendarStatus = linked
      ? { connected: true, email: linked.email }
      : { connected: false };
    response.json(status);
  }),
);

integrationsRouter.get(
  "/google/system-calendar/connect",
  requireAdmin,
  wrap(async (request, response) => {
    requireGoogleConfigured();

    const actor = requireUser(request);
    const state = randomToken(24);
    await db().oauthStates.insertOne({
      id: state,
      userId: actor.id,
      purpose: "system-calendar",
      createdAt: nowIso(),
    });

    sendToGoogle(request, response, googleCalendarAuthUrl(state));
  }),
);

integrationsRouter.post(
  "/google/system-calendar/disconnect",
  requireAdmin,
  wrap(async (_request, response) => {
    await db().googleAccounts.deleteOne({ id: SYSTEM_CALENDAR_ID });
    response.status(204).end();
  }),
);

/** Google's own words when a test fails, so an admin can see what to fix. */
function googleError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid_grant/i.test(message)) {
    return "Google refused the saved connection (it was revoked, or expired — apps still in Google's \"Testing\" mode lose access after 7 days). Disconnect and connect again.";
  }
  return `Google said: ${message}`;
}

/** Sends a real email through the connected Gmail account, to the admin asking. */
integrationsRouter.post(
  "/google/mail/test",
  requireAdmin,
  wrap(async (request, response) => {
    const actor = requireUser(request);
    const linked = await db().googleMailer.findById("system");
    if (!linked) throw new ApiError("Gmail is not connected yet.", 409);
    try {
      await sendGmail({
        refreshToken: linked.refreshToken,
        to: actor.email,
        subject: "Serendib Learn: Gmail sending works",
        body: `This is a test from Administration → Google. Verification codes, receipts, lesson reminders and notifications will now arrive in real inboxes, sent from ${linked.email}.`,
      });
    } catch (error) {
      throw new ApiError(googleError(error), 502);
    }
    response.json({ sentTo: actor.email, from: linked.email });
  }),
);

/**
 * Makes a real Google Meet link on the Serendib calendar, then deletes the
 * throwaway event (no invitations go out), to prove bookings will get one.
 */
integrationsRouter.post(
  "/google/system-calendar/test",
  requireAdmin,
  wrap(async (_request, response) => {
    const linked = await db().googleAccounts.findById(SYSTEM_CALENDAR_ID);
    if (!linked) throw new ApiError("The Serendib calendar is not connected yet.", 409);
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let meeting;
    try {
      meeting = await createGoogleMeeting({
        refreshToken: linked.refreshToken,
        summary: "Serendib Learn: connection test (deleted straight away)",
        description: "Created by Administration → Google → Make a test Meet link.",
        startIso: start.toISOString(),
        endIso: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
        timezone: "Asia/Colombo",
        attendeeEmails: [],
      });
    } catch (error) {
      throw new ApiError(googleError(error), 502);
    }
    await deleteGoogleMeeting(linked.refreshToken, meeting.eventId);
    response.json({ meetLink: meeting.meetLink, calendar: linked.email });
  }),
);

/**
 * Google lands the browser here after the consent screen, for either
 * purpose. There is no session requirement — `state` is what proves which of
 * our users started this, and what it was for, since Google's redirect does
 * not necessarily behave like a same-site request. It is single-use and
 * expires quickly either way.
 */
integrationsRouter.get(
  "/google/callback",
  wrap(async (request, response) => {
    const state = String(request.query.state ?? "");
    const code = String(request.query.code ?? "");

    const pending = await db().oauthStates.findById(state);
    if (pending) await db().oauthStates.deleteOne({ id: state });

    const backTo = `${config.appUrl}${pending ? RETURN_PATH[pending.purpose] : "/portal"}`;

    if (request.query.error) {
      response.redirect(`${backTo}?google=cancelled`);
      return;
    }

    if (!pending || Date.now() - new Date(pending.createdAt).getTime() > STATE_TTL_MS) {
      response.redirect(`${backTo}?google=error`);
      return;
    }

    try {
      const link = await exchangeGoogleAuthCode(code);

      if (pending.purpose === "calendar" || pending.purpose === "system-calendar") {
        const id = pending.purpose === "calendar" ? pending.userId : SYSTEM_CALENDAR_ID;
        await db().googleAccounts.deleteOne({ id });
        await db().googleAccounts.insertOne({
          id,
          refreshToken: link.refreshToken,
          email: link.email,
          connectedAt: nowIso(),
        });
      } else {
        await db().googleMailer.deleteOne({ id: "system" });
        await db().googleMailer.insertOne({
          id: "system",
          refreshToken: link.refreshToken,
          email: link.email,
          connectedAt: nowIso(),
        });
      }

      response.redirect(`${backTo}?google=connected`);
    } catch {
      response.redirect(`${backTo}?google=error`);
    }
  }),
);
