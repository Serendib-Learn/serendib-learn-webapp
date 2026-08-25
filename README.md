# Serendib Learn

Live Sinhala and Tamil tutoring, taught by Sri Lankans, for people with a reason to learn — a
family, a move, a place they want to belong to. This repository holds the whole product: the
public marketing pages, two free learning games built from the project's vocabulary and heritage
research, and a member portal covering booking, payment, materials, homework, community and
moderation.

The content — the eight Survival Sri Lanka chapters, the eighteen heritage sites and the tutor
profiles — comes from the source documents in `docs/`.

## Two services

| Path | What it is | Port |
| --- | --- | --- |
| `/` | Next.js app: pages, games, portal UI | 3000 |
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
npm --prefix server run seed   # wipe the data and seed again
```

If `npm install` fails behind a corporate proxy with `SELF_SIGNED_CERT_IN_CHAIN`, run it with
`NODE_OPTIONS=--use-system-ca` so Node trusts the machine's certificate store.

## Data

The API stores documents in one JSON file, `server/data/db.json`, written atomically and
gitignored. It seeds itself on first boot, so the portal has lessons, homework and posts to show
before you create anything.

The store is deliberately MongoDB-shaped: collections of documents, Mongo's filter operators, and
a `Collection<T>` interface in `server/src/db/store.ts` that the driver can implement directly.
`server/README.md` has the four steps for the switch.

Passwords are hashed with scrypt from Node's `crypto`, and sessions are opaque tokens in an
httpOnly cookie. Seeded accounts all share the password `serendib`:

| Email | Role |
| --- | --- |
| `priya@example.com` | Student, Tamil, mid-course |
| `tom@example.com` | Student, Sinhala, moving to Colombo |
| `nimali@serendiblearn.com` | Tutor, Sinhala |
| `arjun@serendiblearn.com` | Tutor, Tamil |
| `dilani@serendiblearn.com` | Tutor, both languages |
| `admin@serendiblearn.com` | Administrator |

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

## Still demo-shaped

- Checkout confirms a booking without contacting a payment provider.
- The demo inbox is unauthenticated by design, so anyone who can reach the API can read every
  message. `DEMO_MODE=false` closes it and the reset endpoint.
- No rate limiting on login or signup.
- Both games work without an account; scores are only recorded when someone is logged in.
