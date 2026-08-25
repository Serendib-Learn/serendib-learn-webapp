# Serendib Learn API

Express service behind the Next.js app. Data lives in a local JSON document
store today; the store is shaped like MongoDB so that swapping it out is a
contained change.

## Running

```bash
npm install
npm run dev        # node --watch src/index.ts, on http://localhost:4000
npm start          # same thing without the watcher
npm run typecheck  # tsc --noEmit
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
    store.ts            the document store: Collection<T>, filters, file writes
    database.ts         typed collections, seeding, reseeding
  lib/
    passwords.ts        scrypt hashing and verification
    sessions.ts         session cookies, auth middleware
    domain.ts           slot generation, pricing, progress, tutee lookup
    mail.ts             writes to the mail collection instead of sending
    errors.ts           ApiError and the error handler
    http.ts             small request helpers
  routes/               one file per area of the API
```

## Endpoints

All under `/api`. Everything except signup, login, password reset, the waitlist
form, the tutor list and the demo inbox needs a session cookie.

| Area | Routes |
| --- | --- |
| Auth | `GET /auth/me`, `POST /auth/signup`, `/auth/verify`, `/auth/resend`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| Users | `GET /users` (admin), `GET /users/directory`, `GET /users/tutors`, `GET /users/:id`, `GET /users/:id/tutees`, `GET /users/:id/tutors`, `PATCH /users/:id`, `POST /users/:id/role` (admin), `POST /users/:id/membership` (admin), `DELETE /users/:id` (admin) |
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

## Moving to MongoDB

1. `npm install mongodb`.
2. Write a `MongoStore` implementing `Store` and `Collection<T>` from
   `db/store.ts`. The methods map almost one to one: `find`, `findOne`,
   `insertOne`, `updateOne` (as `$set`), `deleteOne`, `countDocuments`. The
   filter objects already use Mongo's `$in`, `$ne`, `$gt`, `$lt` and `$exists`.
3. Point `openStore` at it based on whether `MONGODB_URI` is set.
4. Documents key off a string `id` rather than `_id`, so add a unique index on
   `id` per collection. Nothing else in the service reads `_id`.

Nothing in `routes/` should need to change.

## Things that are still demo-shaped

- **Payments.** `POST /bookings/:id/pay` marks the booking paid without touching
  a payment provider. (The Meet link it creates is real once the tutor has
  connected Google Calendar — see above — it is only the payment that is
  faked.)
- **Mail.** `lib/mail.ts` always writes into a collection that the site's demo
  inbox reads, real send or not. The inbox is unauthenticated, because the
  verification code has to be readable before the account can log in — so
  every message is visible to anyone who can reach the API. Set
  `DEMO_MODE=false` to close it. (`deliver()` does send for real through
  Gmail once an admin connects one from the admin area's Mail tab — see
  above — but the demo-inbox copy keeps getting written either way.)
- **Rate limiting.** There is none. Login and signup are open to brute force.
