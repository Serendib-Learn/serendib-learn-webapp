---
name: serendib-dev
description: Use when adding or changing features in the Serendib Learn app — new pages, API routes, data models, portal screens, or games. Covers the two-service architecture (Next.js frontend + Express API), the shared-types contract, the Backend interface pattern, auth/session model, and the local dev workflow. Trigger on requests like "add a new page", "add an API endpoint", "add a field to bookings/users/etc", "wire up the portal", or "change the design/theme".
---

# Developing Serendib Learn

Serendib Learn is a live Sinhala/Tamil tutoring product: a public marketing
site + two free games, and a member portal (booking, materials, homework,
community, messaging), backed by a separate Express API.

**Before writing any frontend code**, read `AGENTS.md` at the repo root and
the relevant guide under `node_modules/next/dist/docs/` — this repo pins a
Next.js version with breaking changes from the model's training data. Don't
assume App Router conventions you already know still apply; check the docs.

## Architecture (read `README.md` and `server/README.md` for full detail)

| Path | What it is | Port |
| --- | --- | --- |
| `/` (root) | Next.js app: pages, games, portal UI | 3000 |
| `/server` | Express API: accounts, bookings, everything persisted | 4000 |
| `/shared` | Domain types + seed data imported by both sides | — |

The two deploy independently. The frontend talks to the API only through
`NEXT_PUBLIC_API_URL` — never hardcode the API origin in a component.

## Running it locally

Two terminals, API first:

```bash
cd server && npm install && npm run dev   # http://localhost:4000
npm install && npm run dev                # http://localhost:3000 (repo root)
```

Useful checks before calling something done:

```bash
npm run lint
npm --prefix server run typecheck
npm --prefix server test
```

Verify UI changes by running the dev server and checking the page in a
browser (see the `run` skill). For API changes, both an automated check and
a manual one are warranted: extend the relevant `routes/*.test.ts` (see
"Tests" below) *and* sanity-check against the endpoint table in
`server/README.md`.

## Adding a new API endpoint

1. Add/extend the type in `shared/types.ts` if the shape is new.
2. Add the route in `server/src/routes/<area>.ts` (one file per area: auth,
   users, availability, bookings, materials, homework, progress, community,
   messages, misc). Use `requireAuth` / `requireAdmin` /
   `requireSelfOrAdmin(request, id)` from `lib/sessions.ts` for authorization
   — don't skip this even for "obviously safe" reads.
3. Use the `Collection<T>` methods on `db()` (`find`, `findOne`, `insertOne`,
   `updateOne`, `deleteOne`, `countDocuments`) with Mongo-shaped filters
   (`$in`, `$ne`, `$gt`, `$lt`, `$exists`) — never reach for the JSON file or
   a Mongo client directly. `database.ts` picks the JSON store
   (`db/store.ts`) or the real MongoDB store (`db/mongo-store.ts`) based on
   whether `MONGODB_URI` is set; routes never know which one is live.
4. Remember: relative imports need explicit `.ts` extensions, and type-only
   imports must use `import type` — Node runs this TypeScript directly by
   stripping types, no build step.
5. If the body needs real validation (email format, enums, length bounds,
   more than one field), use `zod` + `lib/validate.ts`'s `parseBody` — see
   `routes/auth.ts` for the pattern. Give the base `z.string()` an
   `{ error }` message too, not just `.min()`/`.pipe()` — otherwise a
   missing field surfaces zod's generic "expected string, received
   undefined" instead of a message a user should see.

## Adding a new frontend feature

1. Add the method to the `Backend` interface in `src/lib/api/backend.ts`,
   then implement it in `src/lib/api/http-backend.ts`. Every screen talks to
   `Backend`, never to `fetch`/the API directly — this is what lets the
   implementation be swapped later without touching call sites.
2. Use `useQuery` / `useAction` from `src/lib/hooks.ts` to call it from a
   component.
3. Public marketing pages go under `src/app/(public)/`; portal pages
   (require auth) go under `src/app/portal/(app)/`, using `portal-shell.tsx`
   and the per-role dashboard components in `src/components/portal/`.
4. Reuse primitives from `src/components/ui/` (button, field, modal) rather
   than styling new ones from scratch.

## Google integration

Three independent OAuth flows, one shared client — see `server/README.md`'s
"Google: sign-in, Calendar, Meet and Gmail" section before touching any:

- **Sign-in**: `lib/google.ts`'s `verifyGoogleCredential`, an ID-token check
  only. Needs `GOOGLE_CLIENT_ID`.
- **Calendar + Meet**: `routes/integrations.ts`'s `/google/*` +
  `lib/google.ts`. A tutor connects once (portal → Calendar → My hours),
  storing a refresh token in `googleAccounts` (one row per tutor);
  `POST /bookings/:id/pay` then creates a real Calendar event with Meet
  conferencing instead of the placeholder link.
- **Gmail**: `routes/integrations.ts`'s `/google/mail/*` +
  `lib/google.ts`'s `sendGmail`. Site-wide, not per-user — one admin connects
  once (admin area → Mail), storing a refresh token in `googleMailer` (one
  fixed row, id `"system"`); `lib/mail.ts`'s `deliver()` then sends for real
  on top of its existing demo-inbox write.

Calendar and Gmail both need `GOOGLE_CLIENT_SECRET` in addition to the client
id, since both run a full authorization-code exchange, not just an ID-token
check. All three degrade gracefully when unset — check `googleEnabled()` /
`googleCalendarEnabled()` before assuming any is configured, the same
pattern `DEMO_MODE` uses. Adding a fourth Google-backed feature later should
extend the shared `googleOAuthClient()` / `authUrl()` / `exchangeGoogleAuthCode()`
helpers in `lib/google.ts` rather than duplicating the OAuth plumbing.

## Auth model

Scrypt password hashing, opaque session tokens in an httpOnly cookie (see
`server/src/lib/passwords.ts` and `sessions.ts`). There's no real mail
provider — verification codes and password resets land in the `mail`
collection and surface in the **Demo Inbox** UI
(`src/components/site/demo-inbox.tsx`) instead of an inbox. Seeded test
accounts (password `serendib` for all) are listed in the root `README.md`.

## Security

Covered: `helmet()` headers, rate limiting (`lib/rate-limit.ts` — 300/15min
general, 20/15min on `/api/auth`, keyed off the real client IP via
`trust proxy`), `zod` validation on auth, optional Cloudflare Turnstile
CAPTCHA on signup/waitlist (`lib/turnstile.ts`, off unless
`TURNSTILE_SECRET_KEY` is set), and an admin audit log (`lib/audit.ts`,
`auditLog` collection) for role/membership changes, deletions, and
moderation. Full rationale in `server/README.md`'s "Security" section —
read it before changing any of these, and log a new admin action the same
way (`logAudit(actor, action, targetLabel, detail?)`) rather than leaving it
untracked.

NoSQL injection is prevented by convention, not a library: every route
coerces `request.body`/`request.query` with `String()`/`Number()` before it
reaches a filter. Do the same in new routes — a filter object taken
straight from user input is the mistake this convention exists to avoid.

## Tests

`node --test`, run from `server/` — no Vitest/Jest, consistent with running
this TypeScript directly rather than through a bundler. `npm test` runs
everything.

- Pure logic (`lib/domain.test.ts`): straight unit tests, no I/O.
- Anything hitting routes (`routes/*.test.ts`, `db/mongo-store.test.ts`):
  boot a real Express app + real (in-memory) MongoDB via
  `test-support/harness.ts`'s `startTestServer()`, then hit it over actual
  HTTP with `fetch`. Add new route coverage here, following `bookings.test.ts`
  or `auth.test.ts`'s shape — signed-up-and-verified test users, one `test()`
  per behavior, assert on both the status code and the body.
- The harness's `close()` closes three separate things (HTTP connections,
  the MongoClient via `db/database.ts`'s `disconnect()`, the in-memory
  mongod) — miss any one and the test process hangs instead of exiting,
  which is a much harder failure to diagnose than a normal test failure. If
  a new test file hangs, check `close()` is actually being awaited in an
  `after()` hook before suspecting the test logic itself.
- Not covered yet: materials/homework/community/messages routes, the Google
  integrations (would need mocking `googleapis`), and the frontend.

## Deployment & infra

Target: Vercel (frontend, its own git integration, no workflow file for it)
+ Google Cloud Run (API, via `.github/workflows/deploy-backend.yml`) +
MongoDB Atlas. Full setup steps in `DEPLOYMENT.md`; day-to-day, what matters
for code changes:

- `.github/workflows/ci.yml` runs lint + typecheck + build + a Docker build
  of both images on every push/PR — treat a red CI run on a PR as the same
  signal as `npm run lint`/`typecheck` failing locally.
- `server/Dockerfile` and the root `Dockerfile` both build from the **repo
  root** as their context (`docker build -f server/Dockerfile .`), because
  both apps import `shared/` by relative path (`../../../shared/...` from
  the API, `../../shared/...` from the frontend) — a context of just
  `server/` or just the app itself would not have `shared/` available. If a
  new top-level shared dependency is ever added, both Dockerfiles' COPY
  lines need it too, not just server/package.json or package.json.
- `NEXT_PUBLIC_*` env vars are compiled into the client bundle at Docker
  **build** time, not read at container start — they're `ARG`s in the root
  Dockerfile and `build.args` in `docker-compose.yml`, never
  `environment:`. Getting this backwards silently ships the wrong API URL.
- Production cookies need `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`
  (already set in `deploy-backend.yml`) because Vercel and Cloud Run are
  different domains — `lax` (the local-dev default) would silently break
  login by never sending the session cookie back cross-site.

## Redesigning the frontend

If asked to restyle the site to match the original/old Serendib Learn site:
the old site is the one referenced by hyperlinks inside
`docs/Serendib_Website_Review_Tracker.xlsx` (`https://www.serendiblearn.com/`
and its subpages) — that tracker doc is the design/content review reference,
not a local file. Confirm with the user before fetching or scraping an
external site. Tailwind theme tokens and global styles live in
`src/app/globals.css`; site-wide chrome is in `src/components/site/`.
