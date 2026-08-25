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
```

There is no automated test suite in this repo yet — verify UI changes by
running the dev server and checking the page in a browser (see the `run`
skill), and verify API changes with the endpoint table in `server/README.md`.

## Adding a new API endpoint

1. Add/extend the type in `shared/types.ts` if the shape is new.
2. Add the route in `server/src/routes/<area>.ts` (one file per area: auth,
   users, availability, bookings, materials, homework, progress, community,
   messages, misc). Use `requireAuth` / `requireAdmin` /
   `requireSelfOrAdmin(request, id)` from `lib/sessions.ts` for authorization
   — don't skip this even for "obviously safe" reads.
3. Use the `Collection<T>` methods on `server/src/db/store.ts` (`find`,
   `findOne`, `insertOne`, `updateOne`, `deleteOne`, `countDocuments`) with
   Mongo-shaped filters (`$in`, `$ne`, `$gt`, `$lt`, `$exists`) — the store is
   deliberately Mongo-shaped for an eventual migration, so don't bypass it
   with ad hoc JSON file access.
4. Remember: relative imports need explicit `.ts` extensions, and type-only
   imports must use `import type` — Node runs this TypeScript directly by
   stripping types, no build step.

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

## Auth model

Scrypt password hashing, opaque session tokens in an httpOnly cookie (see
`server/src/lib/passwords.ts` and `sessions.ts`). There's no real mail
provider — verification codes and password resets land in the `mail`
collection and surface in the **Demo Inbox** UI
(`src/components/site/demo-inbox.tsx`) instead of an inbox. Seeded test
accounts (password `serendib` for all) are listed in the root `README.md`.

## Known "still demo-shaped" areas

Don't be surprised by these — they're intentional placeholders, not bugs,
unless the task is specifically to replace them:

- Bookings are marked paid without a real payment provider.
- The Demo Inbox is unauthenticated by design (verification codes must be
  readable pre-login); `DEMO_MODE=false` closes it.
- No rate limiting on login/signup.

## Redesigning the frontend

If asked to restyle the site to match the original/old Serendib Learn site:
the old site is the one referenced by hyperlinks inside
`docs/Serendib_Website_Review_Tracker.xlsx` (`https://www.serendiblearn.com/`
and its subpages) — that tracker doc is the design/content review reference,
not a local file. Confirm with the user before fetching or scraping an
external site. Tailwind theme tokens and global styles live in
`src/app/globals.css`; site-wide chrome is in `src/components/site/`.
