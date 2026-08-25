import type { Server } from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Boots a real instance of the API — actual Express app, actual MongoDB
 * (in-memory, one per call) — for integration tests to hit over HTTP.
 *
 * `config.ts` reads `process.env` once, at import time, so these env vars
 * have to be set *before* `index.ts` (which imports `config.ts`) is ever
 * imported. A dynamic `import()` is what makes that possible from inside a
 * function: unlike a static `import`, it isn't hoisted, so everything above
 * it — setting env vars — has already run by the time it executes.
 *
 * `index.ts` has a top-level `await connect()` before it starts listening,
 * so this `import()` doesn't resolve until the app is fully up.
 */
export async function startTestServer() {
  const mongod = await MongoMemoryServer.create();

  Object.assign(process.env, {
    MONGODB_URI: mongod.getUri(),
    MONGODB_DB_NAME: "serendib_test",
    PORT: "0",
    CORS_ORIGINS: "http://localhost:3000",
    APP_URL: "http://localhost:3000",
    DEMO_MODE: "true",
    COOKIE_SAMESITE: "lax",
    COOKIE_SECURE: "false",
    // Explicitly off, so a test run never depends on real credentials.
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    TURNSTILE_SECRET_KEY: "",
  });

  const { server } = (await import("../index.ts")) as { server: Server };
  const { disconnect } = await import("../db/database.ts");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not bind to a TCP port.");
  }

  const baseUrl = `http://localhost:${address.port}/api`;

  /** A cookie jar per call site, since each test usually wants its own session. */
  function client() {
    let cookie = "";

    async function request(path: string, init: RequestInit = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...init.headers,
        },
      });

      const setCookie = response.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];

      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      return { status: response.status, body };
    }

    return {
      get: (path: string) => request(path),
      post: (path: string, body?: unknown) =>
        request(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
    };
  }

  async function close() {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      // fetch() keeps its HTTP/1.1 connection alive by default, and
      // server.close()'s callback does not fire until every open
      // connection ends.
      server.closeAllConnections();
    });
    // Closes the MongoClient itself, not just the mongod process — an
    // unclosed client's monitoring timers otherwise keep the test process
    // alive indefinitely after everything else has finished.
    await disconnect();
    await mongod.stop();
  }

  return { baseUrl, client, close };
}
