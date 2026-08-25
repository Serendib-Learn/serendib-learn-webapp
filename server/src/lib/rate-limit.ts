import rateLimit from "express-rate-limit";

/**
 * Two tiers: a loose one on everything, and a much tighter one specifically
 * on auth, where the cost of missing a limit is an account takeover attempt
 * rather than someone scripting the tutor list.
 */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in a few minutes." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait a few minutes and try again." },
});
