import { db } from "../db/database.ts";
import { newId, nowIso } from "./ids.ts";
import type { User } from "../../../shared/types.ts";

/**
 * A durable trail of administrative actions — role/membership changes,
 * deletions, moderation decisions — so "who did this, and when" has an
 * answer later. Write-only from routes; read via GET /users/audit-log.
 */
export async function logAudit(
  actor: User,
  action: string,
  targetLabel: string,
  detail?: string,
): Promise<void> {
  await db().auditLog.insertOne({
    id: newId("al"),
    actorId: actor.id,
    actorName: actor.name,
    action,
    targetLabel,
    detail,
    createdAt: nowIso(),
  });
}
