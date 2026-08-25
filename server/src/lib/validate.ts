import type { ZodType } from "zod";
import { ApiError } from "./errors.ts";

/**
 * Parses `body` against `schema`, throwing the same `ApiError` shape every
 * other validation failure in this API already throws — so a route using
 * this reads no differently to the frontend than one that hand-rolled its
 * checks. Only the first issue is surfaced; good enough for a form with one
 * problem at a time, which is how these get filled in anyway.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const [issue] = result.error.issues;
    throw new ApiError(issue?.message ?? "That request was not valid.");
  }
  return result.data;
}
