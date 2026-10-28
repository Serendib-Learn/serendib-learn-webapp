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
| Auth | `GET /auth/me`, `POST /auth/signup` (a `tutor` signup carries an optional `application`), `/auth/verify`, `/auth/resend`, `/auth/login`, `/auth/google`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| Users | `GET /users` (admin), `GET /users/directory`, `GET /users/tutors` (public: approved tutors, no emails, with `bookable`), `POST /users/invite` (admin; email optional for a tutor), `POST /users/:id/email` (admin: add the address to an account listed without one, and send the invite), `POST /users/:id/verify` (admin: confirm someone's email when the code never arrived), `GET /users/audit-log` (admin), `GET /users/:id` (yourself, your own students for a tutor, anyone for an admin), `GET /users/:id/tutees`, `GET /users/:id/tutors` (public profiles, no emails), `PATCH /users/:id` (profile fields only, zod-validated), `POST /users/:id/role` (admin), `POST /users/:id/tutor-status` (admin), `POST /users/:id/membership` (admin), `DELETE /users/:id` (admin) |
| Availability | `GET /availability?tutorId`, `GET /availability/slots?tutorId&days`, `POST /availability`, `DELETE /availability/:id` |
| Bookings | `GET /bookings?userId`, `GET /bookings/:id`, `POST /bookings`, `POST /bookings/:id/checkout`, `GET /bookings/:id/payment`, `POST /bookings/:id/pay` (demo, or admin), `/cancel`, `/complete`, `/meeting-link`, `/reschedule` (free), `/use-credit` (book with a free lesson) |
| Requests | `GET /requests` (yours; all for an admin), `POST /requests` (students: `free_session` or `missed_session`), `POST /requests/:id/approve\|decline` (admin), `GET /requests/credits` (free lessons left) |
| Payments | `GET /payments/config`, `POST /payments/webhook` (Payments.lk, signature-verified) |
| Feedback | `GET /feedback/pending`, `POST /feedback`, `GET /feedback?tutorId\|studentId` (or all, admin), `POST /feedback/lesson-notes`, `POST /voice-notes`, `GET /voice-notes/:id` |
| Chapters | `GET /chapters`, `POST /chapters` (admin), `PATCH /chapters/:id` (admin), `DELETE /chapters/:id` (admin) |
| Materials | `GET /materials?studentId\|ownerId`, `GET /materials/library`, `POST /materials`, `POST /materials/:id/assign`, `POST /materials/:id/chapter`, `DELETE /materials/:id`, `GET /materials/feedback/mine`, `GET /materials/feedback/summary` (owner/admin), `GET\|PUT /materials/:id/feedback` |
| Homework | `GET /homework?studentId\|tutorId`, `POST /homework`, `POST /homework/:id/submit`, `/review` |
| Progress | `GET /lesson-notes?studentId`, `GET /progress?tutorId`, `GET /progress/:studentId` |
| Community | `GET /posts`, `GET /posts/pending` (admin), `POST /posts`, `POST /posts/:id/like`, `GET\|POST /posts/:id/replies`, `POST /posts/:id/moderate` (admin), `GET /community/members?language`, `GET\|POST /community/connections`, `POST /community/connections/:id/accept\|decline`, `DELETE /community/connections/:id` |
| Messages | `GET /threads`, `POST /threads` (student-to-student needs a friend connection), `GET\|POST /threads/:id/messages`, `POST /threads/:id/read` |
| Jobs | `POST /jobs/reminders` (header `X-Cron-Secret`; off unless `CRON_SECRET` is set) |
| Profile photos | `GET /profile-photos/:userId` (public, listed tutors only, `?v=<photoId>`), `PUT\|DELETE /profile-photos/:userId` (the tutor, or an admin) |
| Content | `GET /content/:kind`, `GET /content/:kind/:id` (public), `PUT /content/:kind/:id` (create: admin; change: its editors), `DELETE /content/:kind/:id` (admin) — kinds `phrase-lists`, `alphabet`, `holidays`, `stages`, `heritage` |
| Alphabet audio | `GET /alphabet-audio` (public list), `GET /alphabet-audio/:language/:key` (public audio), `PUT\|DELETE /alphabet-audio/:language/:key` (approved tutors and admins) |
| Waitlist | `POST /waitlist`, `GET /waitlist` (admin) |
| Demo | `GET /mail`, `POST /mail/:id/read`, `DELETE /mail`, `POST /demo/reset` |
| Integrations | `GET /integrations/google/status`, `GET /integrations/google/connect`, `POST /integrations/google/disconnect`, `GET /integrations/google/mail/status\|connect` (admin), `POST /integrations/google/mail/disconnect` (admin), `GET /integrations/google/system-calendar/status\|connect` (admin), `POST /integrations/google/system-calendar/disconnect` (admin), `GET /integrations/google/callback` |

## Accounts: students, tutors and the super admin

- **Students** sign up at `/portal/signup`. Their membership turns active on
  the first paid booking, which is also what makes them a vetted community
  member (`lib/community.ts`'s `isVetted`).
- **Tutors** sign up at `/portal/signup?role=tutor` with an optional short
  application, and stay `tutorStatus: "pending"` — unlisted and unbookable —
  until an admin approves them (Administration → Tutor applications). Admins
  are emailed on every application. A tutor record with no `tutorStatus`
  predates approvals and counts as approved. An admin can also **invite** a
  tutor (or anyone): the account is created already verified (and approved)
  and a seven-day set-your-password link is emailed (`lib/accounts.ts`).
  A tutor can be invited **without an email address**: the account is
  created with `email: ""`, appears on the public tutors page with its
  profile and photo, and is `bookable: false` (no booking, no messages, no
  mail) until an admin adds the address with `POST /users/:id/email`, which
  sends the invite. Tutor photos live in the `profilePhotos` collection
  (`routes/profile-photos.ts`), keyed by user id; `User.photoId` versions
  the image URL.
- **The super admin** is the owners' account: `SUPER_ADMIN_EMAIL` (+
  `SUPER_ADMIN_NAME`, `SUPER_ADMIN_PASSWORD`) makes sure it exists on every
  boot, and `npm run create-admin -- --email … --name "…"` does the same from
  a shell against whatever `.env` points at. A `superAdmin` account cannot be
  demoted or deleted from the admin area.
- With `DEMO_MODE=false` the demo accounts (which share a published password,
  one of them an admin) are never seeded.

## Payments

`lib/payments.ts` and `routes/payments.ts`, on the official
`@payments-lk/node` SDK. Off (demo checkout) until `PAYMENTS_LK_SECRET_KEY` is
set; an `sk_test_` key takes sandbox payments on Payable's sandbox, `sk_live_`
real ones — the key decides, the API address is the same.

1. `POST /bookings/:id/checkout` (the student, or an admin) creates a hosted
   checkout referenced to the booking — or returns the current one while it is
   still open — priced in LKR cents from the booking's USD price at
   `USD_TO_LKR`, and the browser is sent to its `url`.
2. **The webhook confirms.** `POST /api/payments/webhook` is mounted with a
   raw body parser *before* `express.json()` (the signature covers the exact
   bytes), verified against `PAYMENTS_LK_WEBHOOK_SECRET` with a five-minute
   replay window, de-duplicated by event id (`paymentEvents`), and:
   `payment.succeeded` confirms the booking if the amount matches what was
   asked; `payment.failed` records the decline; `checkout.expired` releases
   the held slot.
3. `GET /bookings/:id/payment` reads the checkout back and confirms from it —
   the checkout page polls this after the customer returns, which is also how
   a payment confirms on localhost, where no webhook can arrive.
4. Confirmation (`lib/booking-confirmation.ts`, shared with the demo path and
   admin "mark paid") makes the Meet link, activates membership, and emails a
   receipt and a tutor notice. It is idempotent.

Once a key is set, `POST /bookings/:id/pay` (the instant demo confirm) is
refused for students; admins keep it to record a payment taken some other way.

## Who can do what: students, tutors, admins

The API enforces these itself; the portal only hides what a role cannot use.

| | Student | Tutor | Admin |
| --- | --- | --- | --- |
| Be booked into a lesson (as the student) | ✓ | — | — (but can book for a student) |
| Publish teaching hours | — | ✓ own | ✓ any tutor |
| Set homework, assign material | — | ✓ own students only | ✓ anyone |
| Read a full account record (email) | own | own + own students | ✓ |
| Rate, years teaching, specialties on a profile | — | ✓ | ✓ on tutors |
| Move a lesson (free) | ✓ ≥24h before, to an open hour | ✓ any time before it starts | ✓ |
| Ask for a free session / report a missed lesson | ✓ | — | — |
| Approve or decline those requests | — | — | ✓ (super admin too) |
| Feedback after a lesson | rating, pace, materials, what next | write-up, progress, engagement, materials used | reads all |
| Feedback on a material | helpfulness, level | works-in-lessons, suggestion | reads all |

"Own students" are `lib/domain.ts`'s `tuteeIdsOf`: anyone with a booking,
an assigned material or homework from that tutor.

## Rescheduling, free lessons and help requests

`routes/bookings.ts`, `routes/requests.ts`, `lib/credits.ts`.

- **Rescheduling is free.** `POST /bookings/:id/reschedule` keeps the price,
  the payment (or free lesson) and the Meet link, moves the Google Calendar
  event (`lib/google.ts`'s `moveGoogleMeeting`), resets the before-lesson
  reminders, records the move in `booking.reschedules` and emails both
  people. Students need `STUDENT_RESCHEDULE_NOTICE_HOURS` (24) notice and one
  of the tutor's open hours; tutors and admins can move it any time before
  it starts, to any free time.
- **Free lessons** (`lessonCredits`) are one-hour lessons a student books
  instead of paying (`POST /bookings/:id/use-credit`, offered on the
  calendar and the checkout page). They come from an approved request, or
  automatically when a tutor or admin cancels a lesson the student paid
  for. Cancelling a lesson booked with one gives it back. A student
  cancelling their own paid lesson is not refunded — the portal suggests
  moving it instead.
- **Requests** (`studentRequests`) are a student asking for a free session
  (a reason, one pending at a time) or reporting a missed lesson (which one,
  what happened, up to 30 days after). Admins are emailed and decide under
  Administration → Requests: approving grants a free lesson, declining
  needs a note, and the student is emailed either way.

## Lesson feedback, voice notes and reminders

`routes/feedback.ts`, `lib/feedback.ts`, `lib/reminders.ts`. Once a lesson's
end time passes, `GET /feedback/pending` lists it for each side, and each
side is asked different things. The student owes a rating (1–5), the pace
(too slow / about right / too fast), how helpful the materials were, what
to work on next, a comment and an optional voice note. The tutor owes a
write-up (a `LessonNote`, which also marks the booking completed): what was
covered, what went well, what to work on, new words, where the student
stands (`progress`, shown to them), how engaged they were (`engagement`,
1–5, hidden from the student) and the materials used — the tutor's own are
assigned to the student, library ones are already visible.

Materials have their own feedback (`materialFeedback`, one entry per person
per material, editable): students rate helpfulness and whether the level
was right; tutors rate how well it works in a lesson and suggest
improvements. Students rate what they can see; tutors rate the open library
(the learning hub's "Shared library"); nobody rates their own. The owner and
admins read it all (`GET /materials/:id/feedback`, ratings summary on each
card). Reminders go out at
class end and once more 24 hours later, only for what is still missing, and
are recorded on the booking (`feedbackReminders`) so nothing sends twice.
They run on an in-process timer every `REMINDER_INTERVAL_MS` (0 = off) and on
`POST /jobs/reminders` with `X-Cron-Secret: $CRON_SECRET` — use the latter
from Cloud Scheduler, since an idle Cloud Run instance gets no CPU.

Voice notes are uploaded as base64 JSON with their own 5 MB body limit
(index.ts skips the general 256 KB parser for `/api/voice-notes`), capped at
three minutes, and served only to the two people on the lesson and admins.
Only the author can attach a note to their own feedback or write-up.

## Teaching content

`routes/content.ts`, `server/src/seed/`. Phrase lists, alphabet sheets,
holidays, course stage descriptions and heritage sites live in the database
(`phraseLists`, `alphabetSheets`, `holidays`, `courseStages`,
`heritageSites`) and every screen reads them through `/api/content/:kind`.
Nothing in `src/` hard-codes them, and ESLint fails any import of
`server/`, `seed/` or `shared/curriculum` from the site.

- **Filling.** `db/database.ts`'s `seedTeachingContent` fills each
  collection once, while it is empty, from `server/src/seed/*.ts` (demo or
  not, like the course chapters). After that the database is the source:
  edit in the portal's Content page, not the seed files.
- **Who edits.** Reads are public (the alphabet sheet and the games are
  public pages). Approved, verified tutors and admins change phrase lists
  and alphabet sheets; only admins create or delete, and only admins touch
  holidays, stages and heritage sites. Each kind has its own zod schema; a
  phrase list's phrases are renumbered on save; deleting a phrase list
  unlinks the chapters that showed it; alphabet sheets can't be deleted.
- **Audit.** Every change is logged (`content_added`, `content_updated`,
  `content_removed`) with who made it, and the item keeps `updatedById`.

## Course chapters

`routes/chapters.ts`. Every database gets the outline in
`shared/curriculum.ts` the first time it is empty (demo or not). Materials
carry an optional `chapterId`; deleting a chapter unfiles its materials
rather than deleting them.

## Community: practice partners and friends

`routes/connections.ts`, `lib/community.ts`. Vetted students (email
confirmed + a paid booking) who have not opted out (`openToPractice: false`)
are listed to other vetted members, without contact details. Friend requests
can be accepted, declined (quietly), cancelled or removed; asking someone who
already asked you accepts. Students can message each other only while
friends; anything involving a tutor or admin is open. Conversations never
carry the other person's email address.

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
- **Rate limiting.** `lib/rate-limit.ts` — a flood guard of 1500 req/15min
  on all of `/api` (the portal refetches after every write and polls, and
  households share an IP), and 20 req/15min on credential attempts under
  `/api/auth` (`GET /auth/me` and logout do not count — counting them signed
  busy people out). `RATE_LIMIT_SCALE` multiplies both; only the tests set it. `app.set("trust proxy", 1)` makes
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
- `startTestServer(env)` takes per-file env overrides (applied last), e.g.
  `lib/accounts.test.ts` boots with `DEMO_MODE=false` and a super admin, and
  `lib/rate-limit.test.ts` runs at the real limits. `test-support/accounts.ts`
  has the shared helpers: the seeded admin, signed-up-and-verified users
  (tutors approved unless asked not to), and the latest mail to an address.
- Payments run the real SDK against `test-support/fake-payments-lk.ts`, a
  local stand-in for api.payments.lk that can also "pay" or expire a
  checkout and sign webhook bodies like the real thing.
- Covered: the signup → verify → login flow, duplicate-email and
  wrong-password rejections (with the identical error message for both, so
  the API can't be used to enumerate accounts), password reset and invite
  links, tutor approval, the super admin bootstrap and its protections, the
  booking lifecycle with manual meeting links, Payments.lk checkout/webhook/
  status polling (pricing, reuse, forged and replayed signatures, wrong
  amounts, expiry), the feedback loop and its reminders, voice-note privacy,
  chapters, practice partners and friend-gated messaging, the rate limits,
  and the Mongo store's handling of `undefined` updates; who can do what as
  a student or tutor (`access.test.ts`), free rescheduling, free-session and
  missed-lesson requests and the free lessons they grant
  (`lesson-help.test.ts`), and role-specific session and material feedback
  (`role-feedback.test.ts`).
- Not covered yet: posts, the Google
  integrations (would need mocking `googleapis`), and anything on the
  frontend (checked by hand in a browser for every change so far).

If a test hangs instead of failing, it's almost always an unclosed resource
keeping Node's event loop alive rather than a broken test — `close()` in the
harness has to close the HTTP server's connections *and* the MongoDB client
(via `db/database.ts`'s `disconnect()`) *and* stop the in-memory mongod, all
three, or the process never exits on its own.
