"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getRevision, getServerRevision, subscribe } from "@/lib/api/revision";

/** Bumps after every write through the API, so views can refetch. */
export function useRevision(): number {
  return useSyncExternalStore(subscribe, getRevision, getServerRevision);
}

const noSubscription = () => () => {};

/**
 * The browser's timezone, empty while rendering on the server so the markup
 * matches on hydration.
 */
export function useTimezone(): string {
  return useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export interface QueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error?: string;
}

interface Settled<T> {
  key: string;
  depsKey: string;
  data?: T;
  error?: string;
}

/**
 * Runs `loader` on mount, whenever `deps` change, and whenever the store is
 * written to. `loader` is intentionally not a dependency — pass anything it
 * closes over in `deps` instead.
 *
 * A refetch triggered by a store write keeps the previous data on screen, so
 * mutations do not blank out the page. Changing `deps` does clear it, because
 * the old data belongs to something else.
 */
export function useQuery<T>(loader: () => Promise<T>, deps: unknown[]): QueryResult<T> {
  const revision = useRevision();
  const depsKey = JSON.stringify(deps);
  const key = `${revision}:${depsKey}`;

  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let live = true;

    loaderRef.current().then(
      (data) => {
        if (live) setSettled({ key, depsKey, data });
      },
      (error: unknown) => {
        if (live) setSettled({ key, depsKey, error: errorMessage(error) });
      },
    );

    return () => {
      live = false;
    };
  }, [key, depsKey]);

  const current = settled?.depsKey === depsKey ? settled : null;
  const inFlight = settled?.key !== key;

  return {
    data: current?.data,
    loading: current === null || (inFlight && current.data === undefined),
    error: inFlight ? undefined : current?.error,
  };
}

/** Wraps a mutation so forms get pending and error state without ceremony. */
export function useAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  });

  const run = useCallback(async (...args: Args): Promise<Result | undefined> => {
    setPending(true);
    setError(undefined);
    try {
      return await actionRef.current(...args);
    } catch (thrown) {
      setError(errorMessage(thrown));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error, clearError: () => setError(undefined) };
}
