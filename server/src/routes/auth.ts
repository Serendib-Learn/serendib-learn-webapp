import { Router } from "express";
import { z } from "zod";
import { db } from "../db/database.ts";
import { notifyAdmins, passwordLink, RESET_LINK_MS, tokenExpired } from "../lib/accounts.ts";
import { ApiError, unauthorized, wrap } from "../lib/errors.ts";
import { verifyGoogleCredential } from "../lib/google.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { hashPassword, sixDigitCode, verifyPassword } from "../lib/passwords.ts";
import { endSession, startSession } from "../lib/sessions.ts";
import { requireTurnstile } from "../lib/turnstile.ts";
import { parseBody } from "../lib/validate.ts";
import { characterIds } from "../../../shared/avatars.ts";
import type { Role, User } from "../../../shared/types.ts";

export const authRouter = Router();

const MIN_PASSWORD = 8;

const NOT_AN_EMAIL = "That does not look like an email address.";
const PASSWORD_TOO_SHORT = `Use at least ${MIN_PASSWORD} characters for your password.`;

// `{ error }` on the base z.string() covers "missing or the wrong type
// entirely" (zod's own message there is a generic "expected string, got
// undefined") — the friendlier message from .min()/.pipe() only fires once
// a string actually made it that far.

/** Trimmed, lowercased, and shape-checked — not just "contains an @". */
const emailSchema = z
  .string({ error: NOT_AN_EMAIL })
  .trim()
  .toLowerCase()
  .pipe(z.email(NOT_AN_EMAIL));

const languagesSchema = z
  .array(z.enum(["sinhala", "tamil"]))
  .min(1, "Pick at least one language.");

/** Optional at signup — a tutor can fill the rest of their profile in later. */
const applicationSchema = z
  .object({
    headline: z.string().trim().max(140, "Keep the headline under 140 characters.").optional(),
    bio: z.string().trim().max(2000, "Keep the introduction under 2000 characters.").optional(),
    homeTown: z.string().trim().max(80).optional(),
    yearsTeaching: z.coerce.number().int().min(0).max(70).optional(),
  })
  .optional();

const signUpSchema = z.object({
  name: z
    .string({ error: "We need a name to put on your account." })
    .trim()
    .min(1, "We need a name to put on your account."),
  email: emailSchema,
  password: z.string({ error: PASSWORD_TOO_SHORT }).min(MIN_PASSWORD, PASSWORD_TOO_SHORT),
  role: z.enum(["student", "tutor"]).default("student"),
  languages: languagesSchema,
  timezone: z.string().trim().min(1).default("UTC"),
  application: applicationSchema,
  avatarId: z.enum(characterIds as [string, ...string[]]).optional(),
  turnstileToken: z.string().optional(),
});

const emailOnlySchema = z.object({ email: emailSchema });

const verifySchema = z.object({
  email: emailSchema,
  code: z
    .string({ error: "Enter the code from your email." })
    .trim()
    .min(1, "Enter the code from your email."),
});

const loginSchema = z.object({
  email: emailSchema,
  // Deliberately not the signup min-length policy: a login checks a
  // password that already exists, whatever length it happens to be.
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password."),
});

const googleSignInSchema = z.object({
  credential: z
    .string({ error: "Google did not send a credential." })
    .min(1, "Google did not send a credential."),
  intent: z.enum(["login", "signup"]),
  role: z.enum(["student", "tutor"]).optional(),
  languages: z.array(z.enum(["sinhala", "tamil"])).optional(),
  timezone: z.string().trim().optional(),
  avatarId: z.enum(characterIds as [string, ...string[]]).optional(),
});

const RESET_LINK_INVALID = "That reset link has already been used, or never existed.";

const resetPasswordSchema = z.object({
  token: z.string({ error: RESET_LINK_INVALID }).min(1, RESET_LINK_INVALID),
  password: z.string({ error: PASSWORD_TOO_SHORT }).min(MIN_PASSWORD, PASSWORD_TOO_SHORT),
});

/** Tells the admins a tutor is waiting for a decision. */
async function announceTutorApplication(tutor: User): Promise<void> {
  await notifyAdmins(
    `New tutor application: ${tutor.name}`,
    `${tutor.name} (${tutor.email}) has applied to teach ${tutor.languages.join(" and ")}.\n\n${tutor.headline ? `"${tutor.headline}"\n\n` : ""}Review it in the portal: Administration → Tutor applications. Students cannot book them until you approve.`,
  );
}

const pendingTutorWelcome =
  "Thanks for applying to teach with Serendib Learn. Your application is with our team now — we personally vet every tutor, and we will be in touch to talk it through. In the meantime, fill in your profile and set your hours in the portal calendar; students can book you as soon as you are approved.";

async function sendVerification(email: string): Promise<void> {
  const code = sixDigitCode();

  await db().verificationCodes.deleteOne({ id: email });
  await db().verificationCodes.insertOne({ id: email, code, createdAt: nowIso() });

  await deliver({
    to: email,
    subject: `Confirm your email — your code is ${code}`,
    body: `Welcome to Serendib Learn — we're so glad you're here.\n\nEnter this code on the verification screen to finish setting up your account:\n\n${code}\n\nIf you ask for a new code, this one stops working. If you didn't sign up, you can safely ignore this email.`,
    kind: "verification",
    code,
  });
}

authRouter.get("/me", (request, response) => {
  response.json({ user: request.user ?? null });
});

authRouter.post(
  "/signup",
  wrap(async (request, response) => {
    const input = parseBody(signUpSchema, request.body);
    await requireTurnstile(input.turnstileToken, request.ip);

    if (await db().users.findOne({ email: input.email })) {
      throw new ApiError("An account with that email already exists.");
    }

    const user: User = {
      id: newId("u"),
      name: input.name,
      email: input.email,
      role: input.role,
      verified: false,
      membership: "none",
      createdAt: nowIso(),
      timezone: input.timezone,
      languages: input.languages,
      ...(input.avatarId ? { avatarId: input.avatarId } : {}),
    };

    if (input.role === "tutor") {
      // Nobody can book a tutor until an administrator has approved them.
      user.tutorStatus = "pending";
      const application = input.application ?? {};
      if (application.headline) user.headline = application.headline;
      if (application.bio) user.bio = application.bio;
      if (application.homeTown) user.homeTown = application.homeTown;
      if (application.yearsTeaching !== undefined) user.yearsTeaching = application.yearsTeaching;
    }

    await db().users.insertOne(user);
    await db().credentials.insertOne({
      id: user.id,
      hash: await hashPassword(input.password),
    });
    await sendVerification(user.email);

    response.status(201).json({ email: user.email });
  }),
);

authRouter.post(
  "/verify",
  wrap(async (request, response) => {
    const { email, code } = parseBody(verifySchema, request.body);

    const pending = await db().verificationCodes.findById(email);
    if (!pending) {
      throw new ApiError("There is nothing waiting to be verified for that email.");
    }
    if (pending.code !== code) {
      throw new ApiError("That code is not right. Check the inbox again.");
    }

    const user = await db().users.findOne({ email });
    if (!user) throw new ApiError("That account no longer exists.");

    const verified = await db().users.updateOne({ id: user.id }, { verified: true });
    await db().verificationCodes.deleteOne({ id: email });
    await startSession(response, verified ?? user);

    await deliver({
      to: user.email,
      subject:
        user.tutorStatus === "pending"
          ? "We've got your application — welcome to Serendib Learn"
          : "You're in — welcome to Serendib Learn",
      body:
        user.tutorStatus === "pending"
          ? pendingTutorWelcome
          : user.role === "tutor"
            ? "Your tutor account is live. Set your availability in the portal calendar so students can book you, then upload your first material to the learning hub."
            : "Your account is live. Find a tutor in the portal calendar, and say hello in the community while you wait for your first lesson.",
      kind: "welcome",
    });

    if (user.tutorStatus === "pending") await announceTutorApplication(verified ?? user);

    response.json({ user: verified });
  }),
);

authRouter.post(
  "/resend",
  wrap(async (request, response) => {
    const { email } = parseBody(emailOnlySchema, request.body);
    const user = await db().users.findOne({ email });

    if (!user) throw new ApiError("No account found for that email.");
    if (user.verified) throw new ApiError("That email is already verified.");

    await sendVerification(email);
    response.status(204).end();
  }),
);

authRouter.post(
  "/login",
  wrap(async (request, response) => {
    const { email, password } = parseBody(loginSchema, request.body);

    const user = await db().users.findOne({ email });
    const credential = user ? await db().credentials.findById(user.id) : null;

    // Accounts created through Google have no password until someone sets one,
    // so say that rather than letting them guess at a password that cannot work.
    if (user && !credential && user.googleId) {
      throw new ApiError(
        "This account signs in with Google. Use the Google button, or reset your password to add one.",
        403,
        "use_google",
      );
    }

    // Same message either way, so the form cannot be used to discover which
    // addresses have accounts.
    const failure = unauthorized("Those details do not match an account.");
    if (!user || !credential) throw failure;
    if (!(await verifyPassword(password, credential.hash))) throw failure;

    if (!user.verified) {
      throw new ApiError(
        "Confirm your email address first — check your inbox (and spam folder) for the code.",
        403,
        "not_verified",
      );
    }

    await startSession(response, user);
    response.json({ user });
  }),
);

/**
 * Sign in with a Google ID token. Three cases: the account is already linked,
 * an account exists under the same verified address and gets linked, or there
 * is no account at all — which only creates one when the request came from the
 * signup page and therefore carries a role and languages.
 */
authRouter.post(
  "/google",
  wrap(async (request, response) => {
    const body = parseBody(googleSignInSchema, request.body);
    const identity = await verifyGoogleCredential(body.credential);

    const linked = await db().users.findOne({ googleId: identity.googleId });
    if (linked) {
      await startSession(response, linked);
      response.json({ user: linked, created: false });
      return;
    }

    const existing = await db().users.findOne({ email: identity.email });
    if (existing) {
      if (!identity.emailVerified) {
        throw new ApiError(
          "Google has not verified that address, so we cannot attach it to an existing account.",
          403,
        );
      }

      const updated = await db().users.updateOne(
        { id: existing.id },
        {
          googleId: identity.googleId,
          avatarUrl: identity.avatarUrl ?? existing.avatarUrl,
          // Google vouching for the address is as good as our own code.
          verified: true,
        },
      );

      await startSession(response, updated ?? existing);
      response.json({ user: updated, created: false });
      return;
    }

    if (body.intent !== "signup") {
      throw new ApiError(
        "There is no account for that Google address yet.",
        404,
        "no_account",
      );
    }

    const role: Exclude<Role, "admin"> = body.role === "tutor" ? "tutor" : "student";
    const languages = body.languages ?? [];

    if (languages.length === 0) throw new ApiError("Pick at least one language.");

    const user: User = {
      id: newId("u"),
      name: identity.name,
      email: identity.email,
      role,
      // No code to type: Google has already proven they own the address.
      verified: identity.emailVerified,
      membership: "none",
      createdAt: nowIso(),
      timezone: body.timezone || "UTC",
      languages,
      googleId: identity.googleId,
      avatarUrl: identity.avatarUrl,
      ...(body.avatarId ? { avatarId: body.avatarId } : {}),
      ...(role === "tutor" ? { tutorStatus: "pending" as const } : {}),
    };

    // No credential row: this account has no password until someone sets one
    // through the reset flow.
    const created = await db().users.insertOne(user);
    await startSession(response, created);

    await deliver({
      to: created.email,
      subject:
        created.tutorStatus === "pending"
          ? "We've got your application — welcome to Serendib Learn"
          : "You're in — welcome to Serendib Learn",
      body:
        created.tutorStatus === "pending"
          ? pendingTutorWelcome
          : "Your account is live, signed in with Google. Find a tutor in the portal calendar, and say hello in the community while you wait for your first lesson.",
      kind: "welcome",
    });

    if (created.tutorStatus === "pending") await announceTutorApplication(created);

    response.status(201).json({ user: created, created: true });
  }),
);

authRouter.post(
  "/logout",
  wrap(async (request, response) => {
    await endSession(request, response);
    response.status(204).end();
  }),
);

authRouter.post(
  "/forgot-password",
  wrap(async (request, response) => {
    const { email } = parseBody(emailOnlySchema, request.body);
    const user = await db().users.findOne({ email });

    // Deliberately silent when there is no match.
    if (user) {
      const link = await passwordLink(email, RESET_LINK_MS);

      await deliver({
        to: email,
        subject: "Reset your Serendib Learn password",
        body: `Someone asked to reset the password for this account. Use the link below to choose a new one. It works once, for the next 24 hours.\n\n${link.url}`,
        kind: "password_reset",
        token: link.token,
      });
    }

    response.status(204).end();
  }),
);

authRouter.post(
  "/reset-password",
  wrap(async (request, response) => {
    const { token, password } = parseBody(resetPasswordSchema, request.body);

    const record = await db().resetTokens.findById(token);
    if (!record) {
      throw new ApiError("That reset link has already been used, or never existed.");
    }
    if (tokenExpired(record)) {
      await db().resetTokens.deleteOne({ id: token });
      throw new ApiError("That link has expired. Ask for a new one from the login screen.");
    }

    const user = await db().users.findOne({ email: record.email });
    if (!user) throw new ApiError("That account no longer exists.");

    const hash = await hashPassword(password);
    // A Google-created account has no credential row yet, so this is also how
    // someone adds a password to one.
    const rotated = await db().credentials.updateOne({ id: user.id }, { hash });
    if (!rotated) await db().credentials.insertOne({ id: user.id, hash });
    await db().resetTokens.deleteOne({ id: token });

    // Someone who can read the reset mail has proven they own the address.
    const updated = await db().users.updateOne({ id: user.id }, { verified: true });

    // Any other session was potentially the attacker's.
    await db().sessions.deleteMany({ userId: user.id });
    await startSession(response, updated ?? user);

    response.json({ user: updated });
  }),
);
