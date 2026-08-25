"use client";

/**
 * A counter the HTTP client bumps after every write, so open queries know to
 * refetch. It replaces the change notifications the old in-browser store gave
 * us for free.
 */

let revision = 0;
const listeners = new Set<() => void>();

export function bumpRevision() {
  revision += 1;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRevision(): number {
  return revision;
}

/** Stable during server rendering, so hydration never mismatches. */
export function getServerRevision(): number {
  return 0;
}
