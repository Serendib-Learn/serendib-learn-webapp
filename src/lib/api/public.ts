import type { PublicTutor } from "@/lib/types";

/**
 * Server-side reads for the public marketing pages, which render on the
 * server and do not go through the browser's `Backend` (there is no session
 * to carry). Everything here is public data the API serves without a cookie.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** How often a public page re-reads the tutor roster, in seconds. */
export const TUTOR_REVALIDATE_SECONDS = 60;

/**
 * Approved tutors, as the public sees them. An empty list rather than an
 * error when the API is unreachable — a build machine with no API running,
 * or a brief outage — so the marketing pages still render; the next
 * revalidation picks the roster back up.
 */
export async function fetchPublicTutors(): Promise<PublicTutor[]> {
  try {
    const response = await fetch(`${BASE}/api/users/tutors`, {
      next: { revalidate: TUTOR_REVALIDATE_SECONDS },
    });
    if (!response.ok) return [];
    return (await response.json()) as PublicTutor[];
  } catch {
    return [];
  }
}
