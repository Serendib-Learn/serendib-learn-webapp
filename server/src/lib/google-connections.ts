import { db } from "../db/database.ts";
import { revokeGoogleToken } from "./google.ts";

/**
 * Ends a stored Google connection: deletes our copy of the token, then asks
 * Google to withdraw the access.
 *
 * Google revokes everything one account granted this app, not just the token
 * it is handed. The Serendib account holds both the shared calendar and the
 * Gmail sender, so revoking when one is disconnected would silently stop the
 * other. While another connection still uses the account, only our copy goes.
 */
export async function forgetGoogleConnection(
  store: "googleAccounts" | "googleMailer",
  id: string,
): Promise<void> {
  const collection = db()[store];
  const link = await collection.findById(id);
  if (!link) return;

  await collection.deleteOne({ id });

  const stillUsed =
    (await db().googleAccounts.count({ email: link.email })) +
    (await db().googleMailer.count({ email: link.email }));
  if (stillUsed === 0) await revokeGoogleToken(link.refreshToken);
}
