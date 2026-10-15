import { db } from "../db/database.ts";
import { isBookableTutor } from "./domain.ts";
import type { Connection, User } from "../../../shared/types.ts";

/**
 * Who counts as a vetted member of the community: someone who has confirmed
 * their email and booked a paid lesson (membership becomes active on the
 * first payment), or one of our approved tutors, or the team. This is what the
 * community page means by "everyone here is vetted".
 */
export function isVetted(user: User): boolean {
  if (!user.verified) return false;
  if (user.role === "admin") return true;
  if (user.role === "tutor") return isBookableTutor(user);
  return user.membership === "active";
}

/** The connection between two people, whichever of them asked. */
export async function connectionBetween(a: string, b: string): Promise<Connection | null> {
  return (
    (await db().connections.findOne({ requesterId: a, addresseeId: b })) ??
    (await db().connections.findOne({ requesterId: b, addresseeId: a }))
  );
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  return (await connectionBetween(a, b))?.status === "accepted";
}

/**
 * Students may only message each other once they are friends. Anything
 * involving a tutor or the team is open, as it always was: students ask
 * tutors questions before booking.
 */
export async function mayMessage(sender: User, recipient: User): Promise<boolean> {
  if (sender.role !== "student" || recipient.role !== "student") return true;
  return areFriends(sender.id, recipient.id);
}
