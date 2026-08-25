import { OAuth2Client } from "google-auth-library";
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
