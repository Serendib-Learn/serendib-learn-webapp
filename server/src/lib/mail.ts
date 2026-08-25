import { db } from "../db/database.ts";
import { sendGmail } from "./google.ts";
import { newId } from "./ids.ts";
import type { MailMessage } from "../../../shared/types.ts";

/**
 * Always records the message in a collection the demo inbox reads, so
 * verification codes and receipts can be followed without a mail provider.
 * When an admin has connected a Google account for sending (see
 * `routes/integrations.ts`'s `/google/mail/*`), this also sends it for real
 * through Gmail — best-effort, since a bad address or a revoked token should
 * not break signup, checkout, or anything else that calls this.
 */
export async function deliver(
  message: Omit<MailMessage, "id" | "sentAt" | "read">,
): Promise<MailMessage> {
  const record = await db().mail.insertOne({
    ...message,
    id: newId("mail"),
    sentAt: new Date().toISOString(),
    read: false,
  });

  const mailer = await db().googleMailer.findById("system");
  if (mailer) {
    try {
      await sendGmail({
        refreshToken: mailer.refreshToken,
        to: message.to,
        subject: message.subject,
        body: message.body,
      });
    } catch (error) {
      console.error(`Gmail send to ${message.to} failed:`, error);
    }
  }

  return record;
}
