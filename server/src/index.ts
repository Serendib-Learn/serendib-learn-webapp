import cors from "cors";
import express from "express";
import { config } from "./config.ts";
import { connect } from "./db/database.ts";
import { errorHandler, notFound } from "./lib/errors.ts";
import { loadSession, parseCookies } from "./lib/sessions.ts";
import { authRouter } from "./routes/auth.ts";
import { availabilityRouter } from "./routes/availability.ts";
import { bookingsRouter } from "./routes/bookings.ts";
import { communityRouter } from "./routes/community.ts";
import { homeworkRouter } from "./routes/homework.ts";
import { materialsRouter } from "./routes/materials.ts";
import { messagesRouter } from "./routes/messages.ts";
import { demoRouter, gamesRouter, mailRouter, waitlistRouter } from "./routes/misc.ts";
import { progressRouter } from "./routes/progress.ts";
import { usersRouter } from "./routes/users.ts";

const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: config.origins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "256kb" }));
app.use(parseCookies);
app.use(loadSession);

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, demoMode: config.demoMode });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/homework", homeworkRouter);
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

app.listen(config.port, () => {
  console.log(`Serendib Learn API on http://localhost:${config.port}`);
  console.log(`${accounts} accounts in ${config.dataFile}`);
  console.log(`Allowing credentialed requests from ${config.origins.join(", ")}`);
  if (config.demoMode) {
    console.log("Demo mode is on: the mail inbox and the reset endpoint are open.");
  }
});
