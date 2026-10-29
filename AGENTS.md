<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Where to look before exploring

This repo already has current, maintained docs for most questions. Read the
matching one below **first** — before grepping the codebase, before asking
the user, before re-deriving something already written down. They're kept
up to date as the code changes; treat a stale doc as a bug to flag, not a
reason to skip it.

| The question is about... | Read this first |
| --- | --- |
| The whole product in one place — design, architecture, data model, every feature, infra, runbook | `HANDBOOK.md` |
| What the owners still have to do before launch (Google, domain, payments, tutors…) | `OWNER-CHECKLIST.md` |
| Running the app locally, seeded demo accounts, overall layout | `README.md` |
| Running tests locally, what's covered / not covered | `server/README.md` → "Tests", or `DEPLOYMENT.md` → "Local testing" |
| Deploying to production (Vercel / Cloud Run / MongoDB Atlas), CI/CD, GitHub secrets | `DEPLOYMENT.md` |
| Security measures already in place (rate limiting, headers, validation, CAPTCHA, audit log) | `server/README.md` → "Security" |
| Google sign-in, Calendar/Meet, or Gmail sending — setup or how it works | `server/README.md` → "Google: sign-in, Calendar, Meet and Gmail" |
| The API's storage layer, the JSON-file vs. MongoDB store | `server/README.md` → "The MongoDB store" |
| Adding a new page, API route, or portal feature — conventions to follow | `.claude/skills/serendib-dev/SKILL.md` (or just run the `serendib-dev` skill) |
| Docker images, `docker-compose.yml` | Top comment in `docker-compose.yml`, `DEPLOYMENT.md` → "Local Docker Compose" |
| Brand colors, logo, fonts, voice/tone | `branding/brand-tokens.txt` |
| What's intentionally fake/demo-only right now (payments, etc.) | `README.md` → "Still demo-shaped" |
| Student/tutor sign-up, tutor approval, the super admin, invites | `server/README.md` → "Accounts: students, tutors and the super admin" |
| Payments (Payments.lk checkout, webhook, sandbox keys) | `server/README.md` → "Payments", `DEPLOYMENT.md` → "7. Payments.lk" |
| Lesson feedback, voice notes, reminders, the cron job, material feedback | `server/README.md` → "Lesson feedback, voice notes and reminders" |
| What a student vs a tutor vs an admin may do | `server/README.md` → "Who can do what" |
| Rescheduling, free lessons, free-session and missed-lesson requests | `server/README.md` → "Rescheduling, free lessons and help requests" |
| Course chapters, practice partners / friend requests | `server/README.md` → "Course chapters", "Community: practice partners and friends" |
| Teaching content (phrase lists, alphabet, holidays, stages) — where it lives, who edits it | `server/README.md` → "Teaching content" (it's in the DB, never in `src/`) |
| User types, what each can do, step-by-step user flows | `HANDBOOK.md` → "2. Users, access and user flows" |
| The parked games (how to bring them back) | `src/lib/features.ts` (and search `GAMES-HIDDEN`) |

If none of these match, then explore — but check here first. A five-second
lookup beats re-discovering something already documented.
