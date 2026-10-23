import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.ts";
import { connect } from "./db/database.ts";
import { ensureSuperAdmin } from "./lib/accounts.ts";
import { startReminderTimer } from "./lib/reminders.ts";
import { errorHandler, notFound } from "./lib/errors.ts";
import { apiLimiter, authLimiter } from "./lib/rate-limit.ts";
import { loadSession, parseCookies } from "./lib/sessions.ts";
import { authRouter } from "./routes/auth.ts";
import { availabilityRouter } from "./routes/availability.ts";
import { bookingsRouter } from "./routes/bookings.ts";
import { communityRouter, postImagesRouter } from "./routes/community.ts";
import { homeworkRouter } from "./routes/homework.ts";
import { integrationsRouter } from "./routes/integrations.ts";
import { materialsRouter } from "./routes/materials.ts";
import { messagesRouter } from "./routes/messages.ts";
import { paymentsRouter, paymentsWebhook } from "./routes/payments.ts";
import { alphabetAudioRouter } from "./routes/alphabet-audio.ts";
import { chaptersRouter } from "./routes/chapters.ts";
import { connectionsRouter } from "./routes/connections.ts";
import { feedbackRouter, voiceNotesRouter } from "./routes/feedback.ts";
import { jobsRouter } from "./routes/jobs.ts";
import { demoRouter, gamesRouter, mailRouter, waitlistRouter } from "./routes/misc.ts";
import { profilePhotosRouter } from "./routes/profile-photos.ts";
import { progressRouter } from "./routes/progress.ts";
import { usersRouter } from "./routes/users.ts";

const app = express();

// Cloud Run (and most PaaS) sit behind a single reverse proxy, so the real
// client IP is in X-Forwarded-For, one hop back — express-rate-limit reads
// req.ip, which only reflects that header once this is set. Harmless
// locally, where there is no proxy to forward anything.
app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: config.origins,
    credentials: true,
  }),
);
// The Payments.lk webhook is verified against the exact bytes it was sent
// with, so it gets the raw body and has to be mounted before express.json().
app.post(
  "/api/payments/webhook",
  apiLimiter,
  express.raw({ type: "application/json", limit: "1mb" }),
  paymentsWebhook,
);
// Uploads (voice notes, photos, recordings) need more than the default body
// limit; the general parser skips them and each router brings its own.
const jsonBody = express.json({ limit: "256kb" });
app.use((request, response, next) => {
  const ownParser = [
    "/api/voice-notes",
    "/api/post-images",
    "/api/alphabet-audio",
    "/api/profile-photos",
  ];
  if (ownParser.some((prefix) => request.path.startsWith(prefix))) next();
  else jsonBody(request, response, next);
});
app.use(parseCookies);
app.use(loadSession);
app.use("/api", apiLimiter);

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, demoMode: config.demoMode });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/users", usersRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/voice-notes", express.json({ limit: "5mb" }), voiceNotesRouter);
app.use("/api/post-images", express.json({ limit: "3mb" }), postImagesRouter);
app.use("/api/alphabet-audio", express.json({ limit: "2mb" }), alphabetAudioRouter);
app.use("/api/profile-photos", express.json({ limit: "3mb" }), profilePhotosRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/chapters", chaptersRouter);
app.use("/api/homework", homeworkRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/threads", messagesRouter);
app.use("/api/posts", communityRouter);
app.use("/api/community", connectionsRouter);
app.use("/api/waitlist", waitlistRouter);
app.use("/api/mail", mailRouter);
app.use("/api/games", gamesRouter);
app.use("/api/demo", demoRouter);
app.use("/api", progressRouter);

app.use((_request, _response, next) => {
  next(notFound("No such endpoint."));
});
app.use(errorHandler);

const database = await connect();
await ensureSuperAdmin();
startReminderTimer();
const accounts = await database.users.count();

// Exported for the test harness (server/src/test-support/harness.ts), which imports
// this module dynamically after setting test env vars, then reads
// `server.address()` for the ephemeral port PORT=0 binds to. Nothing else
// should need either export.
export const server = app.listen(config.port, () => {
  console.log(`Serendib Learn API on http://localhost:${config.port}`);
  console.log(
    `${accounts} accounts in ${config.mongodbUri ? `MongoDB (${config.mongodbDbName})` : config.dataFile}`,
  );
  console.log(`Allowing credentialed requests from ${config.origins.join(", ")}`);
  if (config.demoMode) {
    console.log("Demo mode is on: the mail inbox and the reset endpoint are open.");
  }
});

export { app };
