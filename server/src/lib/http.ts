import type { Request } from "express";

/**
 * Express types a path parameter as `string | string[]`, because a pattern can
 * capture the same name twice. None of our routes do, so collapse it.
 */
export function pathParam(request: Request, name: string): string {
  const value = request.params[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function queryParam(request: Request, name: string): string {
  const value = request.query[name];
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value === undefined ? "" : String(value);
}
