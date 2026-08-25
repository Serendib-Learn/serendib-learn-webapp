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

  /** Where the JSON document store keeps its file. */
  dataFile: process.env.DATA_FILE
    ? path.resolve(process.env.DATA_FILE)
    : path.join(root, "data", "db.json"),

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
   * The demo inbox and the reset endpoint exist so the flows can be tried
   * without a mail server. Turn this off for anything real.
   */
  demoMode: process.env.DEMO_MODE !== "false",
} as const;
