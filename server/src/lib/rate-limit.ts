import rateLimit from "express-rate-limit";
import process from "node:process";

/**
 * Two tiers: a loose one on everything, and a much tighter one specifically
 * on auth, where the cost of missing a limit is an account takeover attempt
 * rather than someone scripting the tutor list.
 */

/**
 * RATE_LIMIT_SCALE multiplies both limits. Only the test harness sets it —
 * one test file signs up more accounts than a real person ever would.
 */
const scale = Math.max(1, Number(process.env.RATE_LIMIT_SCALE ?? 1));

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300 * scale,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in a few minutes." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20 * scale,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait a few minutes and try again." },
});
