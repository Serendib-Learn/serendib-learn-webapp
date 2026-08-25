import type { NextFunction, Request, RequestHandler, Response } from "express";

/** An error whose message is safe to show the user. */
export class ApiError extends Error {
  status: number;
  /** Optional machine-readable tag, for the cases the UI has to branch on. */
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function unauthorized(message = "You need to be logged in."): ApiError {
  return new ApiError(message, 401);
}

export function forbidden(message = "You cannot do that."): ApiError {
  return new ApiError(message, 403);
}

export function notFound(message = "That does not exist."): ApiError {
  return new ApiError(message, 404);
}

/** Keeps rejected promises out of the process-level handler. */
export function wrap(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    void Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  console.error("Unhandled error:", error);
  response.status(500).json({ error: "Something went wrong on our side." });
}
