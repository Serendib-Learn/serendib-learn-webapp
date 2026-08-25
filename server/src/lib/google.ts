import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { config } from "../config.ts";
import { ApiError } from "./errors.ts";

export interface GoogleIdentity {
  /** Google's stable id for the account. Survives an email change. */
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
}

let client: OAuth2Client | null = null;

export function googleEnabled(): boolean {
  return config.googleClientId !== "";
}

/**
 * The Calendar connection is a separate OAuth flow from sign-in: sign-in only
 * ever sees an ID token, which proves identity but grants no API access. This
 * needs the client secret too, because it exchanges an authorization code for
 * an access + refresh token pair server-to-server.
 */
export function googleCalendarEnabled(): boolean {
  return config.googleClientId !== "" && config.googleClientSecret !== "";
}

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Built from `googleapis`'s own bundled `google-auth-library`, not the
 * standalone package used by `verifyGoogleCredential` above — `google.calendar()`
 * and `google.oauth2()` below require an instance from that same bundle, and
 * the two packages' `OAuth2Client` classes are not interchangeable.
 */
function calendarOAuthClient() {
  if (!googleCalendarEnabled()) {
    throw new ApiError(
      "Google Calendar is not configured on this server.",
      503,
      "google_calendar_disabled",
    );
  }
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri,
  );
}

/** The URL that starts the Calendar consent flow. `state` round-trips to the callback. */
export function googleCalendarAuthUrl(state: string): string {
  return calendarOAuthClient().generateAuthUrl({
    access_type: "offline",
    // Forces a fresh consent screen, which is the only way Google hands back
    // a refresh token if this account has connected before and revoked it.
    prompt: "consent",
    scope: CALENDAR_SCOPES,
    state,
  });
}

export interface GoogleCalendarLink {
  refreshToken: string;
  email: string;
}

/** Exchanges the authorization code from the callback for a refresh token. */
export async function exchangeGoogleCalendarCode(code: string): Promise<GoogleCalendarLink> {
  const oauth2Client = calendarOAuthClient();

  let refreshToken: string | null | undefined;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    refreshToken = tokens.refresh_token;
    oauth2Client.setCredentials(tokens);
  } catch {
    throw new ApiError("Google would not exchange that code. Try connecting again.", 401);
  }

  if (!refreshToken) {
    throw new ApiError(
      "Google did not offer a refresh token. Remove Serendib Learn from your Google account's connected apps and try again.",
      401,
    );
  }

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) throw new ApiError("Google did not tell us the account's email.", 401);

  return { refreshToken, email: data.email };
}

function calendarClient(refreshToken: string) {
  const oauth2Client = calendarOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface CreateMeetingInput {
  refreshToken: string;
  summary: string;
  description: string;
  startIso: string;
  endIso: string;
  timezone: string;
  attendeeEmails: string[];
}

export interface CreatedMeeting {
  eventId: string;
  meetLink: string;
}

/**
 * Creates a Calendar event with Google Meet conferencing attached, on the
 * primary calendar of whoever owns `refreshToken`. Both parties are invited
 * by email — `sendUpdates: "all"` is what makes Google mail them the invite,
 * so this doubles as the meeting notification.
 */
export async function createGoogleMeeting(input: CreateMeetingInput): Promise<CreatedMeeting> {
  const calendar = calendarClient(input.refreshToken);

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startIso, timeZone: input.timezone },
      end: { dateTime: input.endIso, timeZone: input.timezone },
      attendees: input.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetLink = data.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video",
  )?.uri;

  if (!data.id || !meetLink) {
    throw new ApiError("Google created the event but did not return a Meet link.", 502);
  }

  return { eventId: data.id, meetLink };
}

/** Best-effort: a booking should still cancel even if this fails. */
export async function deleteGoogleMeeting(refreshToken: string, eventId: string): Promise<void> {
  try {
    await calendarClient(refreshToken).events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });
  } catch {
    // The event may already be gone, or the token may have been revoked.
    // Either way the booking's own cancellation is what matters.
  }
}

/**
 * Checks the ID token the browser got from Google: the signature against
 * Google's published keys, the audience against our own client id, and the
 * issuer and expiry. The library caches the key set between calls.
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  if (!googleEnabled()) {
    throw new ApiError(
      "Google sign-in is not configured on this server.",
      503,
      "google_disabled",
    );
  }
  if (!credential) throw new ApiError("Google did not send a credential.");

  client ??= new OAuth2Client(config.googleClientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError("That Google sign-in could not be verified. Try again.", 401);
  }

  if (!payload?.sub || !payload.email) {
    throw new ApiError("Google did not tell us who you are. Try again.", 401);
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: payload.name?.trim() || payload.email.split("@")[0],
    avatarUrl: payload.picture,
  };
}
