import type { NextFunction, Request, RequestHandler, Response } from "express";
import { config } from "../config.ts";
import { db } from "../db/database.ts";
import { forbidden, unauthorized } from "./errors.ts";
import { randomToken } from "./passwords.ts";
import type { User } from "../../../shared/types.ts";

declare module "express-serve-static-core" {
  interface Request {
    /** Set by `loadSession` on every request that carries a valid cookie. */
    user?: User;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: config.session.sameSite,
    secure: config.session.secure,
    maxAge: config.session.maxAgeMs,
    path: "/",
  } as const;
}

export async function startSession(response: Response, user: User): Promise<void> {
  const token = randomToken();
  const now = Date.now();

  await db().sessions.insertOne({
    id: token,
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.session.maxAgeMs).toISOString(),
  });

  response.cookie(config.session.cookie, token, cookieOptions());
}

export async function endSession(request: Request, response: Response): Promise<void> {
  const token = request.cookies[config.session.cookie];
  if (token) await db().sessions.deleteOne({ id: token });
  response.clearCookie(config.session.cookie, { path: "/" });
}

/** Reads the cookie, resolves the user, and drops expired sessions. */
export const loadSession: RequestHandler = (request, _response, next) => {
  const token = request.cookies[config.session.cookie];
  if (!token) {
    next();
    return;
  }

  void (async () => {
    try {
      const session = await db().sessions.findById(token);
      if (!session) {
        next();
        return;
      }

      if (new Date(session.expiresAt).getTime() < Date.now()) {
        await db().sessions.deleteOne({ id: token });
        next();
        return;
      }

      const user = await db().users.findById(session.userId);
      if (user) request.user = user;
      next();
    } catch (error) {
      next(error);
    }
  })();
};

export function requireUser(request: Request): User {
  if (!request.user) throw unauthorized();
  return request.user;
}

export const requireAuth: RequestHandler = (request, _response, next) => {
  next(request.user ? undefined : unauthorized());
};

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!request.user) {
    next(unauthorized());
    return;
  }
  next(request.user.role === "admin" ? undefined : forbidden("Administrators only."));
};

/** Allows the owner of the resource, or any administrator. */
export function requireSelfOrAdmin(request: Request, userId: string): User {
  const user = requireUser(request);
  if (user.id !== userId && user.role !== "admin") {
    throw forbidden("That is somebody else's data.");
  }
  return user;
}

/** Minimal cookie parsing, so there is no dependency for one header. */
export function parseCookies(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.cookie;
  const jar: Record<string, string> = {};

  if (header) {
    for (const part of header.split(";")) {
      const index = part.indexOf("=");
      if (index === -1) continue;
      const name = part.slice(0, index).trim();
      if (!name) continue;
      jar[name] = decodeURIComponent(part.slice(index + 1).trim());
    }
  }

  request.cookies = jar;
  next();
}
