import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.ts";
import { connect } from "./db/database.ts";
import { errorHandler, notFound } from "./lib/errors.ts";
import { apiLimiter, authLimiter } from "./lib/rate-limit.ts";
import { loadSession, parseCookies } from "./lib/sessions.ts";
import { authRouter } from "./routes/auth.ts";
import { availabilityRouter } from "./routes/availability.ts";
import { bookingsRouter } from "./routes/bookings.ts";
import { communityRouter } from "./routes/community.ts";
import { homeworkRouter } from "./routes/homework.ts";
import { integrationsRouter } from "./routes/integrations.ts";
import { materialsRouter } from "./routes/materials.ts";
import { messagesRouter } from "./routes/messages.ts";
import { demoRouter, gamesRouter, mailRouter, waitlistRouter } from "./routes/misc.ts";
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
app.use(express.json({ limit: "256kb" }));
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
app.use("/api/materials", materialsRouter);
app.use("/api/homework", homeworkRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/threads", messagesRouter);
app.use("/api/posts", communityRouter);
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
