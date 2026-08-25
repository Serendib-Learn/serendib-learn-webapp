import { config } from "../config.ts";
import { ApiError } from "./errors.ts";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled(): boolean {
  return config.turnstileSecretKey !== "";
}

/**
 * Confirms a Turnstile token with Cloudflare. Only called when
 * `turnstileEnabled()` — a request with no token is rejected before this
 * runs, and there is nothing to check when CAPTCHA is off.
 */
export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const body = new URLSearchParams({ secret: config.turnstileSecretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body });
    const result = (await response.json()) as { success: boolean };
    return result.success === true;
  } catch {
    // Cloudflare being unreachable should not be indistinguishable from a
    // forged token — but it also should not silently let bots through.
    return false;
  }
}

/** No-op when CAPTCHA is off. Otherwise throws unless `token` checks out. */
export async function requireTurnstile(token: string | undefined, remoteIp?: string): Promise<void> {
  if (!turnstileEnabled()) return;

  if (!token || !(await verifyTurnstile(token, remoteIp))) {
    throw new ApiError(
      "Verification failed. Refresh the page and try again.",
      400,
      "turnstile_failed",
    );
  }
}
