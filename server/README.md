# Serendib Learn API

Express service behind the Next.js app. Data lives in MongoDB when
`MONGODB_URI` is set, or a local JSON document store shaped like Mongo when
it isn't — a quick way to run this with nothing to provision. See "The
MongoDB store" below.

## Running

```bash
npm install
npm run dev        # node --watch src/index.ts, on http://localhost:4000
npm start          # same thing without the watcher
npm run typecheck  # tsc --noEmit
npm test           # node --test — see "Tests" below
npm run seed       # throw the data away and seed again
```

Node 24 runs the TypeScript directly by stripping the types, so there is no
build step and no bundler. Two consequences to keep in mind when editing:

- relative imports need their `.ts` extension, because this is ESM
- type-only imports must say `import type`, because Node cannot tell a type
  from a value when it strips them

Copy `.env.example` to `.env` if you need to change the port, the allowed
origins, or the cookie flags. On first boot the service seeds itself and writes
`data/db.json`, which is gitignored.

## Layout

```
src/
  index.ts              express app, middleware, route mounting
  config.ts             environment
  db/
    store.ts            the JSON-file document store: Collection<T>, filters
    mongo-store.ts       the same Collection<T> surface over real MongoDB
    database.ts         typed collections, picks a store, seeding, reseeding
  lib/
    passwords.ts        scrypt hashing and verification
    sessions.ts         session cookies, auth middleware
    domain.ts           slot generation, pricing, progress, tutee lookup
    google.ts           OAuth flows for sign-in, Calendar, and Gmail
    mail.ts             demo-inbox write, plus a real Gmail send when connected
    validate.ts         parseBody() — zod schema -> ApiError on failure
    rate-limit.ts        the general and auth-specific limiters
    turnstile.ts         Cloudflare Turnstile CAPTCHA verification
    audit.ts             logAudit() — the auditLog collection
    errors.ts           ApiError and the error handler
    http.ts             small request helpers
  routes/               one file per area of the API
  test-support/
    harness.ts          startTestServer() — see "Tests" below
```

## Endpoints

All under `/api`. Everything except signup, login, password reset, the waitlist
form, the tutor list and the demo inbox needs a session cookie.

| Area | Routes |
| --- | --- |
| Auth | `GET /auth/me`, `POST /auth/signup`, `/auth/verify`, `/auth/resend`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| Users | `GET /users` (admin), `GET /users/directory`, `GET /users/tutors`, `GET /users/audit-log` (admin), `GET /users/:id`, `GET /users/:id/tutees`, `GET /users/:id/tutors`, `PATCH /users/:id`, `POST /users/:id/role` (admin), `POST /users/:id/membership` (admin), `DELETE /users/:id` (admin) |
| Availability | `GET /availability?tutorId`, `GET /availability/slots?tutorId&days`, `POST /availability`, `DELETE /availability/:id` |
| Bookings | `GET /bookings?userId`, `GET /bookings/:id`, `POST /bookings`, `POST /bookings/:id/pay`, `/cancel`, `/complete` |
| Materials | `GET /materials?studentId\|ownerId`, `GET /materials/library`, `POST /materials`, `POST /materials/:id/assign`, `DELETE /materials/:id` |
| Homework | `GET /homework?studentId\|tutorId`, `POST /homework`, `POST /homework/:id/submit`, `/review` |
| Progress | `GET /lesson-notes?studentId`, `GET /progress?tutorId`, `GET /progress/:studentId` |
| Community | `GET /posts`, `GET /posts/pending` (admin), `POST /posts`, `POST /posts/:id/like`, `GET\|POST /posts/:id/replies`, `POST /posts/:id/moderate` (admin) |
| Messages | `GET /threads`, `POST /threads`, `GET\|POST /threads/:id/messages`, `POST /threads/:id/read` |
| Waitlist | `POST /waitlist`, `GET /waitlist` (admin) |
| Demo | `GET /mail`, `POST /mail/:id/read`, `DELETE /mail`, `POST /demo/reset` |
| Integrations | `GET /integrations/google/status`, `GET /integrations/google/connect`, `POST /integrations/google/disconnect`, `GET /integrations/google/mail/status` (admin), `GET /integrations/google/mail/connect` (admin), `POST /integrations/google/mail/disconnect` (admin), `GET /integrations/google/callback` |

## Google: sign-in, Calendar, Meet and Gmail

Three independent Google features, sharing one OAuth client but needing
different pieces of it:

- **Sign-in** (`routes/auth.ts`, `lib/google.ts`'s `verifyGoogleCredential`)
  only needs `GOOGLE_CLIENT_ID`. It uses Google Identity Services on the
  frontend, which hands back an ID token — proof of identity, nothing more.
- **Calendar + Meet** (`routes/integrations.ts`'s `/google/*`, the rest of
  `lib/google.ts`) needs `GOOGLE_CLIENT_SECRET` too, because it runs a full
  OAuth authorization-code flow to get a refresh token it can call the
  Calendar API with later, unattended. A tutor connects once from the
  portal's "My hours" tab; from then on, `POST /bookings/:id/pay` creates a
  real Calendar event with Google Meet conferencing on the tutor's calendar,
  invites both parties by email (`sendUpdates: "all"` — this is also how they
  get notified), and stores the Meet link as the booking's `meetingUrl`.
  Cancelling a booking best-effort deletes the event. A tutor who never
  connects still gets the placeholder `meet.serendiblearn.com` link the demo
  always used.
- **Gmail** (`routes/integrations.ts`'s `/google/mail/*`, `lib/google.ts`'s
  `sendGmail`) is the same authorization-code flow requesting `gmail.send`
  instead, but it is site-wide rather than per-user: one admin connects it
  once from the admin area's Mail tab, and `lib/mail.ts`'s `deliver()` — which
  every verification code, receipt and welcome message already goes
  through — sends for real from that account afterward, on top of (not
  instead of) recording the message for the demo inbox. A failed send never
  breaks whatever called `deliver()`; it only logs.

Both connection flows are optional — nothing breaks without them, the site
just keeps behaving exactly as the demo always did. Refresh tokens live in
`googleAccounts` (one row per tutor) and `googleMailer` (one fixed row, id
`"system"`), and are never sent to the frontend.

### Setting up a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and
   create a project (or pick an existing one).
2. **APIs & Services → Library** — enable the **Google Calendar API** and,
   for Gmail sending, the **Gmail API**.
3. **APIs & Services → OAuth consent screen** — choose **External**, fill in
   the required fields, and add yourself under **Test users** (while the app
   is in "Testing" status, only test users can complete the consent screen —
   fine for local development, no Google review needed).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   application type **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:4000/api/integrations/google/callback`
5. Copy the **Client ID** into both `server/.env` (`GOOGLE_CLIENT_ID`) and the
   frontend's `.env.local` (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`) — same value,
   two places. Copy the **Client secret** into `server/.env`
   (`GOOGLE_CLIENT_SECRET`) only; it must never reach the browser.
6. Restart both dev servers so the new env vars load.

Sign-in works as soon as steps 4–6 are done. Calendar and Gmail both need
step 2 (enable the **Gmail API** too, for the mail flow) — their scopes
(`.../auth/calendar.events`, `.../auth/gmail.send`, `.../auth/userinfo.email`)
are requested automatically, nothing to configure by hand, but Google's
consent screen will list them, which is normal.

Deploying for real users means submitting the OAuth consent screen for
[verification](https://support.google.com/cloud/answer/13463073), since both
`calendar.events` and `gmail.send` are sensitive scopes; unverified apps are
capped at 100 test users and show an "unverified app" warning.

## Authorization

`loadSession` resolves the cookie into `request.user` on every request. Route
handlers then use `requireAuth`, `requireAdmin`, or `requireSelfOrAdmin(request, id)`
so that one member cannot read another's bookings, homework or messages. Writes
check ownership too: only the tutor who set a task can mark it, only the owner of
a material can assign it, and only a party to a booking can cancel it.

## The MongoDB store

`db/mongo-store.ts` implements `Store`/`Collection<T>` from `db/store.ts` over
the real driver, and `db/database.ts`'s `connect()` uses it instead of the
JSON file store whenever `MONGODB_URI` is set — nothing in `routes/` had to
change to make that swap, which was the point of shaping the JSON store like
Mongo from the start.

A few things worth knowing if you touch it:

- Documents keep the app's own string `id` field rather than Mongo's `_id`.
  `openMongoStore` creates a unique index on `id` per collection on startup;
  nothing else ever reads `_id`, and every read strips it via projection so
  it can't leak into an API response.
- `FindOptions.sort` in `store.ts` is a JS comparator (routes pass real
  closures, e.g. `(a, b) => a.startsAt.localeCompare(b.startsAt)`), which
  Mongo's native `.sort()` can't run server-side — so `MongoDocCollection.find`
  fetches by filter only, then sorts and limits in Node, same as the JSON
  store already did. Fine at this app's scale.
- `isEmpty()` (used once, to decide whether to seed a fresh database) checks
  whether the `users` collection has any documents, not whether collections
  exist — creating an index creates an empty collection, so existence alone
  would say "not empty" on a completely fresh cluster.

See `DEPLOYMENT.md` for creating a free MongoDB Atlas cluster.

## Security

- **Headers.** `helmet()` on every response (CSP, `X-Frame-Options`,
  `X-Content-Type-Options`, HSTS, etc.).
- **Rate limiting.** `lib/rate-limit.ts` — 300 req/15min on all of `/api`,
  20 req/15min on `/api/auth` specifically. `app.set("trust proxy", 1)` makes
  this key off the real client IP behind Cloud Run's proxy, not the proxy's
  own IP for every request.
- **Input validation.** `routes/auth.ts` validates with `zod` (real email
  format, not just "contains @"; password length; enum fields) via
  `lib/validate.ts`'s `parseBody`. Other routes still hand-validate — the
  same pattern extends cleanly to them if `zod` is worth adopting there too.
- **CAPTCHA.** `lib/turnstile.ts` — Cloudflare Turnstile on signup and the
  waitlist form, off by default. Set `TURNSTILE_SECRET_KEY` (and the
  frontend's `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) to turn it on; see
  `DEPLOYMENT.md`.
- **Audit log.** `lib/audit.ts` records role/membership changes, account
  deletions, and moderation decisions to the `auditLog` collection —
  `GET /users/audit-log` (admin), surfaced in the admin area's Audit log tab.
- **NoSQL injection.** Every route coerces `request.body`/`request.query`
  values with `String()`/`Number()` before they reach a filter — an object
  like `{ $gt: "" }` collapses to the string `"[object Object]"`, not a
  usable Mongo operator. Keep doing this in new routes; don't pass request
  input into a filter unconverted.
- **CSRF.** No explicit token — relies on `CORS_ORIGINS` being a real
  allowlist (never a wildcard) plus every mutating request being JSON, which
  forces a CORS preflight that a disallowed origin never passes. Loosening
  either of those reopens this.

Not yet done, if this goes further: request logging with actor/IP for
incident response, and secrets rotation docs.

## Tests

`node --test` (Node's own runner — no Vitest/Jest, consistent with running
this TypeScript directly with no build step):

```bash
npm test              # everything: unit + integration
```

- **Unit** (`lib/domain.test.ts`): pure functions — slot overlap, pricing,
  which booking statuses occupy a slot. No I/O.
- **Integration** (`routes/*.test.ts`, `db/mongo-store.test.ts`): a real
  Express app + a real (in-memory) MongoDB via `mongodb-memory-server`, hit
  over actual HTTP with `fetch`. `test-support/harness.ts`'s `startTestServer()`
  sets test env vars and dynamically imports `index.ts` — dynamic, because a
  static `import` is hoisted above the env vars it depends on, which
  `config.ts` reads once at import time.
- Covered: the full signup → verify → login flow, duplicate-email and
  wrong-password rejections (with the identical error message for both, so
  the API can't be used to enumerate accounts), password reset, and the
  booking lifecycle (create → slot-clash detection → pay → complete, with
  authorization checked at every step).
- Not covered yet: most other routes (materials, homework, community,
  messages), the Google integrations (would need mocking `googleapis`), and
  anything on the frontend.

If a test hangs instead of failing, it's almost always an unclosed resource
keeping Node's event loop alive rather than a broken test — `close()` in the
harness has to close the HTTP server's connections *and* the MongoDB client
(via `db/database.ts`'s `disconnect()`) *and* stop the in-memory mongod, all
three, or the process never exits on its own.
