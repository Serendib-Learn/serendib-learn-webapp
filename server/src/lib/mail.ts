import { db } from "../db/database.ts";
import { newId } from "./ids.ts";
import type { MailMessage } from "../../../shared/types.ts";

/**
 * Stands in for an email provider. Messages land in a collection the demo inbox
 * reads, so verification codes and receipts can be followed without SMTP. Swap
 * the body of this function for a real send when there is a provider.
 */
export async function deliver(
  message: Omit<MailMessage, "id" | "sentAt" | "read">,
): Promise<MailMessage> {
  return db().mail.insertOne({
    ...message,
    id: newId("mail"),
    sentAt: new Date().toISOString(),
    read: false,
  });
}
