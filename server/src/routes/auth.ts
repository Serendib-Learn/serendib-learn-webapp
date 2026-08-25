import { Router } from "express";
import { db } from "../db/database.ts";
import { ApiError, unauthorized, wrap } from "../lib/errors.ts";
import { verifyGoogleCredential } from "../lib/google.ts";
import { newId, normaliseEmail, nowIso } from "../lib/ids.ts";
import { deliver } from "../lib/mail.ts";
import { hashPassword, randomToken, sixDigitCode, verifyPassword } from "../lib/passwords.ts";
import { endSession, startSession } from "../lib/sessions.ts";
import type { LanguageCode, Role, User } from "../../../shared/types.ts";

export const authRouter = Router();

const MIN_PASSWORD = 8;

function readSignUp(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const email = normaliseEmail(String(input.email ?? ""));
  const password = String(input.password ?? "");
  const name = String(input.name ?? "").trim();
  const role = input.role === "tutor" ? "tutor" : "student";
  const languages = Array.isArray(input.languages)
    ? (input.languages.filter(
        (value) => value === "sinhala" || value === "tamil",
      ) as LanguageCode[])
    : [];

  if (!name) throw new ApiError("We need a name to put on your account.");
  if (!email.includes("@")) throw new ApiError("That does not look like an email address.");
  if (password.length < MIN_PASSWORD) {
    throw new ApiError(`Use at least ${MIN_PASSWORD} characters for your password.`);
  }
  if (languages.length === 0) throw new ApiError("Pick at least one language.");

  return {
    name,
    email,
    password,
    role: role as Exclude<Role, "admin">,
    languages,
    timezone: String(input.timezone ?? "UTC"),
  };
}

async function sendVerification(email: string): Promise<void> {
  const code = sixDigitCode();

  await db().verificationCodes.deleteOne({ id: email });
  await db().verificationCodes.insertOne({ id: email, code, createdAt: nowIso() });

  await deliver({
    to: email,
    subject: `Confirm your email — your code is ${code}`,
    body: `Welcome to Serendib Learn.\n\nYour confirmation code is ${code}. Enter it on the verification screen to finish setting up your account.\n\nIf you did not sign up, you can ignore this.`,
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
    const input = readSignUp(request.body);

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
    };

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
    const email = normaliseEmail(String(request.body?.email ?? ""));
    const code = String(request.body?.code ?? "").trim();

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
      subject: "You're in — welcome to Serendib Learn",
      body:
        user.role === "tutor"
          ? "Your tutor account is live. Set your availability in the portal calendar so students can book you, then upload your first material to the learning hub."
          : "Your account is live. Find a tutor in the portal calendar, or warm up with the Survival Sri Lanka decks in Games.",
      kind: "welcome",
    });

    response.json({ user: verified });
  }),
);

authRouter.post(
  "/resend",
  wrap(async (request, response) => {
    const email = normaliseEmail(String(request.body?.email ?? ""));
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
    const email = normaliseEmail(String(request.body?.email ?? ""));
    const password = String(request.body?.password ?? "");

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
        "Confirm your email address first — check your inbox for the code.",
        403,
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
    const body = (request.body ?? {}) as Record<string, unknown>;
    const identity = await verifyGoogleCredential(String(body.credential ?? ""));

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

    const role = body.role === "tutor" ? "tutor" : "student";
    const languages = Array.isArray(body.languages)
      ? (body.languages.filter(
          (value) => value === "sinhala" || value === "tamil",
        ) as LanguageCode[])
      : [];

    if (languages.length === 0) throw new ApiError("Pick at least one language.");

    const user: User = {
      id: newId("u"),
      name: identity.name,
      email: identity.email,
      role: role as Exclude<Role, "admin">,
      // No code to type: Google has already proven they own the address.
      verified: identity.emailVerified,
      membership: "none",
      createdAt: nowIso(),
      timezone: String(body.timezone ?? "UTC"),
      languages,
      googleId: identity.googleId,
      avatarUrl: identity.avatarUrl,
    };

    // No credential row: this account has no password until someone sets one
    // through the reset flow.
    const created = await db().users.insertOne(user);
    await startSession(response, created);

    await deliver({
      to: created.email,
      subject: "You're in — welcome to Serendib Learn",
      body:
        created.role === "tutor"
          ? "Your tutor account is live, signed in with Google. Set your availability in the portal calendar so students can book you."
          : "Your account is live, signed in with Google. Find a tutor in the portal calendar, or warm up with the Survival Sri Lanka decks in Games.",
      kind: "welcome",
    });

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
    const email = normaliseEmail(String(request.body?.email ?? ""));
    const user = await db().users.findOne({ email });

    // Deliberately silent when there is no match.
    if (user) {
      const token = randomToken(24);
      await db().resetTokens.insertOne({ id: token, email, createdAt: nowIso() });

      await deliver({
        to: email,
        subject: "Reset your Serendib Learn password",
        body: `Someone asked to reset the password for this account. Use the link below to choose a new one. It works once.\n\n/portal/reset-password?token=${token}`,
        kind: "password_reset",
        token,
      });
    }

    response.status(204).end();
  }),
);

authRouter.post(
  "/reset-password",
  wrap(async (request, response) => {
    const token = String(request.body?.token ?? "");
    const password = String(request.body?.password ?? "");

    if (password.length < MIN_PASSWORD) {
      throw new ApiError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    }

    const record = await db().resetTokens.findById(token);
    if (!record) {
      throw new ApiError("That reset link has already been used, or never existed.");
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
