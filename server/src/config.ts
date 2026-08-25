import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 4000),

  /** Origins allowed to send credentialed requests. 3001 is next dev's fallback port. */
  origins: list(process.env.CORS_ORIGINS, [
    "http://localhost:3000",
    "http://localhost:3001",
  ]),

  /** Where the JSON document store keeps its file. Only used when MONGODB_URI is unset. */
  dataFile: process.env.DATA_FILE
    ? path.resolve(process.env.DATA_FILE)
    : path.join(root, "data", "db.json"),

  /**
   * Connection string for MongoDB (Atlas or otherwise). Empty means the JSON
   * file store is used instead — handy for a quick local start with nothing
   * to provision, but a real deployment should set this.
   */
  mongodbUri: process.env.MONGODB_URI ?? "",

  /** Database name to use within the Mongo connection. */
  mongodbDbName: process.env.MONGODB_DB_NAME ?? "serendib_learn",

  session: {
    cookie: "sl_session",
    /** Thirty days. */
    maxAgeMs: 30 * 24 * 60 * 60 * 1000,
    /** Set both of these when the API and the site sit on different domains. */
    sameSite: (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none",
    secure: process.env.COOKIE_SECURE === "true",
  },

  /**
   * OAuth client id from Google Cloud. Empty means Google sign-in is switched
   * off: the endpoint refuses and the site hides the button.
   */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",

  /**
   * The same OAuth client's secret, needed only for the Calendar connection
   * flow (sign-in uses the client id alone). Empty means that flow is off:
   * `/integrations/google/connect` refuses and the UI hides the button.
   */
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  /** Where Google redirects after the Calendar consent screen. */
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    `http://localhost:${process.env.PORT ?? 4000}/api/integrations/google/callback`,

  /** Where to send the browser back to once the Calendar connection finishes. */
  appUrl: process.env.APP_URL ?? "http://localhost:3000",

  /**
   * Cloudflare Turnstile secret key. Empty means CAPTCHA is off entirely —
   * signup and the waitlist form accept requests without a token, same as
   * today. Set once bot signups become an actual problem, not before.
   */
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",

  /**
   * The demo inbox and the reset endpoint exist so the flows can be tried
   * without a mail server. Turn this off for anything real.
   */
  demoMode: process.env.DEMO_MODE !== "false",
} as const;
