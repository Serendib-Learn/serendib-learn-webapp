# Serendib Learn

Live Sinhala and Tamil tutoring, taught by Sri Lankans, for people with a reason to learn — a
family, a move, a place they want to belong to. This repository holds the whole product: the
public marketing pages and a free alphabet sheet, and a member portal covering sign-up for
students and tutors (with tutor approval), booking with Google Meet links, card payment through
Payments.lk, materials organised by chapter, homework, a feedback loop after every lesson, and a
vetted community with practice partners.

The course content — the eight Survival Sri Lanka chapters — comes from the source documents in
`docs/`; the original site this replaces (a Lovable prototype) set the learning-hub stages, the
brand and the social links.

**The look follows the original site.** The public pages, the portal frame, the login card,
the calendar, the learning hub folders and the community page reproduce the original
serendib.learn (the Lovable prototype) — its palette, Georgia headings, flower mark and layouts —
with the newer features styled to match. Colours are named after the brand
(`forest`, `fern`, `sage`, `amber-spice`, `cream`, `earth`, `mist`) in `src/app/globals.css`.

**What is parked, not deleted:** the two learning games (Survival Sri Lanka and Explore
Heritage) are still in the code but switched off — every `/games` route 404s and every link is
commented out. `src/lib/features.ts` explains how to bring them back; search for
`GAMES-HIDDEN`.

**Working on this with Claude, Cursor, or another AI assistant?** Read
`AGENTS.md` first — it has a table of "where to look before exploring" that
points straight at the right doc for most questions (deployment, tests,
security, Google integrations, adding a feature, branding), instead of
re-discovering the codebase from scratch each session.

## Two services

| Path | What it is | Port |
| --- | --- | --- |
| `/` | Next.js app: public pages and portal UI | 3000 |
| `/server` | Express API: accounts, bookings, everything persisted | 4000 |
| `/shared` | Domain types and seed data both sides import | — |

They deploy independently. The frontend only knows the API through
`NEXT_PUBLIC_API_URL`, so the API can move to its own host, or its own repo, without touching
a component.

## Running it

Two terminals. API first, since the site expects it.

```bash
cd server
npm install
npm run dev      # http://localhost:4000
```

```bash
npm install
npm run dev      # http://localhost:3000
```

Copy `.env.example` to `.env.local` if the API is not on `localhost:4000`. Other commands:

```bash
npm run build              # production build of the site
npm run lint               # eslint
npm --prefix server run typecheck
npm --prefix server test          # server unit + integration tests
npm --prefix server run seed      # wipe the data and seed again
```

If `npm install` fails behind a corporate proxy with `SELF_SIGNED_CERT_IN_CHAIN`, run it with
`NODE_OPTIONS=--use-system-ca` so Node trusts the machine's certificate store.

## Data

The API stores documents in MongoDB when `MONGODB_URI` is set, or in one local JSON file,
`server/data/db.json`, when it isn't — a quick way to run this with nothing to provision. It
seeds itself on first boot, so the portal has lessons, homework and posts to show before you
create anything. `server/README.md` has more on the storage layer.

Passwords are hashed with scrypt from Node's `crypto`, and sessions are opaque tokens in an
httpOnly cookie. In demo mode (`DEMO_MODE`, on unless set to `false`) these accounts are seeded,
all with the password `serendib` — the seeded tutors are placeholders, not real people. With
`DEMO_MODE=false` nothing is seeded: the first account is the owners' super admin from
`SUPER_ADMIN_EMAIL` (or `npm --prefix server run create-admin`), and real tutors apply at
`/portal/signup?role=tutor` or are invited from Administration → People.

| Email | Role |
| --- | --- |
| `priya@example.com` | Student, Tamil, mid-course |
| `tom@example.com` | Student, Sinhala, moving to Colombo |
| `nimali@serendiblearn.com` | Tutor, Sinhala |
| `arjun@serendiblearn.com` | Tutor, Tamil |
| `dilani@serendiblearn.com` | Tutor, both languages |
| `admin@serendiblearn.com` | Super admin |

Because there is no mail provider, a **Demo Inbox** sits in the bottom right corner of every page.
Verification codes, password reset links and receipts land there, and the same panel resets the
data to its seeded state.

## Layout

```
shared/                types.ts, tutors.ts, seed.ts — the contract between the two services
server/                see server/README.md
src/
  app/
    (public)/          marketing pages and the two games
    portal/            auth screens, then (app)/ for the signed-in portal
  components/
    site/              header, footer, demo inbox
    home/ games/       page-specific pieces
    portal/            dashboards, booking flow, availability, shared portal UI
    ui/                buttons, fields, modal, primitives
  data/                vocabulary and heritage content for the games
  lib/
    api/               Backend interface, HTTP client, revision counter
    auth.tsx           session context
    hooks.ts           useQuery / useAction
```

Every screen talks to the `Backend` interface in `src/lib/api/backend.ts`, and
`src/lib/api/index.ts` is the single line that chooses the implementation. That is what made
replacing the original in-browser mock with a real API a contained change.

## Google: sign-in, Calendar, Meet and Gmail

Three Google features are wired up but need a Google Cloud project's
credentials to switch on — see `server/README.md` for the setup steps:

- Sign-in with Google.
- A tutor connecting their Google Calendar so confirmed bookings get a real
  Calendar event with a Google Meet link — or an admin connecting the shared
  Serendib calendar once (Administration → Google), which makes Meet links for
  every tutor who has not connected their own.
- An admin connecting one Gmail account so verification codes, receipts and
  welcome messages send for real instead of only appearing in the demo inbox.

Without credentials, sign-in hides its button, a booking has no meeting link
until the tutor adds one by hand from the calendar, and mail stays
demo-inbox-only.

## Payments

Bookings are paid on [Payments.lk](https://payments.lk/developers)' hosted
checkout (card details never touch this app). Set `PAYMENTS_LK_SECRET_KEY`
(an `sk_test_` key from the sandbox profile) and `PAYMENTS_LK_WEBHOOK_SECRET`
on the API and it is live; without them the demo checkout confirms bookings
without charging. Tutors price in USD and checkouts are in LKR at `USD_TO_LKR`.
Details in `server/README.md` → "Payments", setup in `DEPLOYMENT.md`.

## Docker and deployment

`docker compose up --build` runs the whole stack (site, API, a local
MongoDB) with nothing installed but Docker — see the comment at the top of
`docker-compose.yml`. `.github/workflows/ci.yml` lints, typechecks, builds,
and Docker-builds both apps on every push and PR. For the real deployment
(Vercel + Google Cloud Run + MongoDB Atlas) and what `deploy-backend.yml`
needs to do it automatically, see **`DEPLOYMENT.md`**.

## Security and tests

Rate limiting, security headers, input validation, an optional CAPTCHA, and
an admin audit log are all in place — see server/README.md's "Security"
section for what's covered and how each is configured. Automated tests
(`npm test` in `server/`) cover auth, tutor approval and the super admin,
bookings, payments (against a local stand-in for the Payments.lk API),
feedback and voice notes, chapters, and the community's friend requests; see
server/README.md's "Tests" section for what's not covered yet.

## Still demo-shaped

- Until `PAYMENTS_LK_SECRET_KEY` is set, checkout confirms a booking without charging anything.
- The demo inbox is unauthenticated by design, so anyone who can reach the API can read every
  message. `DEMO_MODE=false` closes it and the reset endpoint.
- The seeded tutors (Nimali, Arjun, Dilani) are placeholders; real tutors come in through the
  tutor sign-up or an admin invite.
- The alphabet sheet and the avatar characters were drafted with AI as a first pass and are
  labelled for tutor review.
