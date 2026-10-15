import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { config } from "../config.ts";
import { forbidden, notFound, wrap } from "../lib/errors.ts";
import { runReminders } from "../lib/reminders.ts";

export const jobsRouter = Router();

function secretMatches(given: string): boolean {
  const expected = Buffer.from(config.cronSecret);
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Runs the lesson and feedback reminders now. For Cloud Scheduler (or any cron) to call
 * every few minutes with the header `X-Cron-Secret: <CRON_SECRET>`, since an
 * idle Cloud Run instance gets no CPU for the in-process timer.
 */
jobsRouter.post(
  "/reminders",
  wrap(async (request, response) => {
    if (!config.cronSecret) throw notFound("No such endpoint.");
    if (!secretMatches(request.get("x-cron-secret") ?? "")) throw forbidden("Wrong cron secret.");
    const sent = await runReminders();
    response.json({ sent: sent.lesson + sent.feedback, ...sent });
  }),
);
