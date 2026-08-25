import type { Backend } from "./backend";
import { httpBackend } from "./http-backend";

/**
 * The single place the app reaches for data. Every screen goes through the
 * `Backend` interface, so this assignment is the only thing that has to change
 * if the transport changes.
 */
export const api: Backend = httpBackend;

export { ApiError } from "./backend";
export type { StudentProgress, ThreadSummary } from "./backend";
export { DEMO_PASSWORD, demoAccounts } from "../../../shared/seed";

/** Demo-only: send the API's data back to the seeded state. */
export function resetDatabase(): Promise<void> {
  return api.demo.reset();
}
