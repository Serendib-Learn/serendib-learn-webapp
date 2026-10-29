import type { ContentKind, ContentKinds, PublicTutor } from "@/lib/types";

/**
 * Server-side reads for the public marketing pages, which render on the
 * server and do not go through the browser's `Backend` (there is no session
 * to carry). Everything here is public data the API serves without a cookie.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Someone's photo, if they have one: from anything carrying `id` and `photoId` (a user, a profile, a tutor). */
export function photoUrlFor(person?: { id: string; photoId?: string } | null): string | undefined {
  return person?.photoId ? profilePhotoUrl(person.id, person.photoId) : undefined;
}

/** Where a tutor's photo is served from; `photoId` versions it, so a new upload is never cached stale. */
export function profilePhotoUrl(userId: string, photoId: string): string {
  return `${BASE}/api/profile-photos/${userId}?v=${encodeURIComponent(photoId)}`;
}

/**
 * Teaching content for a server-rendered public page (the alphabet sheet,
 * the games). Empty when the API is unreachable, like the tutor roster.
 */
export async function fetchContent<K extends ContentKind>(kind: K): Promise<ContentKinds[K][]> {
  try {
    const response = await fetch(`${BASE}/api/content/${kind}`, {
      next: { revalidate: TUTOR_REVALIDATE_SECONDS },
    });
    if (!response.ok) return [];
    return (await response.json()) as ContentKinds[K][];
  } catch {
    return [];
  }
}

/**
 * The phrase lists as the (parked) language game shows them: one stage's
 * lists in order, with the stage's name and description — all from the API.
 */
export async function fetchPhrasePhase() {
  const [lists, stages] = await Promise.all([fetchContent("phrase-lists"), fetchContent("stages")]);
  const name = lists[0]?.stage ?? "Phrase lists";
  return {
    name,
    blurb: stages.find((stage) => stage.name === name)?.description ?? "",
    chapters: lists.filter((list) => list.stage === name).sort((a, b) => a.number - b.number),
  };
}

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
