# Deploying Serendib Learn

This document has two halves: **testing what you have right now, on your own
computer** (no accounts, no money, no risk), and **putting it on the
internet for real** (needs three new free accounts, on top of the GitHub
one you already have, and about an hour the first time). Do the first half
whenever you're unsure something works. Do the second half once, then
mostly forget about it — pushing to `main` handles the rest automatically.

## What you actually need to do (plain English)

Skip straight to whichever line matches what you're trying to do:

- **"I just want to check the app still works"** → run it locally. See
  [Local testing](#local-testing) below. Costs nothing, needs no accounts.
- **"I want to put this on the internet so other people can use it"** → sign
  up for three free services (MongoDB Atlas, Google Cloud, Vercel) and copy
  some keys between them and your existing GitHub repo. See
  [Going live](#going-live) below. This is a one-time setup; after that,
  deploying is just `git push`.
- **"I want Google sign-in / Calendar / Gmail to actually work"** → that's
  part of "going live" (step 2 and 3 below) — you need a Google Cloud
  account either way, whether or not you use Cloud Run.
- **"Something broke after I deployed"** → check the
  [Go-live checklist](#go-live-checklist) at the bottom first; most breakage
  is one missing setting, not a code problem.

Everything below explains those four steps in detail, with copy-pasteable
commands. You do not need to understand every line of them — just paste them
in order into a terminal after signing into the right account first.

## Target architecture

| Piece | Where | Why | Costs money? |
| --- | --- | --- | --- |
| Next.js site | Vercel, custom domain | Native Next.js builds, zero-config previews | Free tier is enough |
| Express API | Google Cloud Run | Fully managed containers, scales to zero, no server to patch | Free tier is enough at low traffic |
| Database | MongoDB Atlas (free tier) | Managed, works from anywhere, no disk to provision | Free (M0 tier) |
| CI | GitHub Actions (`ci.yml`) | Lint + typecheck + build + test on every push/PR, both apps | Free for public/small private repos |
| CD | GitHub Actions (`deploy-backend.yml`) | Builds the API image and deploys it to Cloud Run on push to `main` | Free |

Vercel deploys the frontend itself via its own GitHub integration — there is
no frontend deploy workflow in `.github/workflows/`, and there shouldn't be
one; it would just be reimplementing what Vercel already does natively.

## Local testing

Do this before touching any of the "going live" steps — it proves the code
itself works, with nothing to sign up for and nothing that can go wrong on
the internet.

**Fastest check — does it build and pass its own tests?**

```bash
npm run lint && npm run typecheck && npm run build   # the website
npm --prefix server run typecheck && npm --prefix server test   # the API
```

If all four commands finish without a red error, the code is sound. This is
exactly what `ci.yml` runs on every push — running it yourself first just
means you find out immediately instead of waiting on GitHub.

**Actually clicking around in it:**

```bash
cd server && npm install && npm run dev   # terminal 1 — API on :4000
npm install && npm run dev                # terminal 2 — site on :3000
```

Open `http://localhost:3000`. Log in with any of the seeded demo accounts in
the root `README.md` (password `serendib` for all of them). Nothing here
needs Google, Cloudflare, or MongoDB Atlas — the API falls back to a local
JSON file (`server/data/db.json`) with no setup, and Google sign-in/CAPTCHA
buttons just don't render when their keys aren't set.

**Whole stack in one command, no Node installed at all:**

```bash
docker compose up --build
```

Same thing, but running inside Docker containers (including a throwaway
local MongoDB) instead of directly on your machine. Useful for confirming
the Docker images themselves are correct, not just the source code.

**What the automated tests actually check:** the full account
signup-to-login flow, and the entire booking lifecycle (book → pay →
complete, including rejecting a double-booked time slot). See
`server/README.md`'s "Tests" section for the full list and what isn't
covered yet.

## Going live

Do these roughly in order — Atlas first, since Cloud Run needs a connection
string; Google Cloud next; Vercel last, since it needs the API's live URL.

## 1. MongoDB Atlas

*In short: this is where your data (accounts, bookings, messages) actually
lives once it's not just a file on your own computer. Free, and you only
set it up once.*

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and a new **M0 (free)** cluster.
2. **Database Access** → add a database user with a generated password (save it).
3. **Network Access** → add `0.0.0.0/0`. Cloud Run has no fixed outbound IP to
   allowlist instead — the connection is still authenticated and TLS-encrypted,
   just not IP-restricted. Tighten this later with [Private Service Connect](https://www.mongodb.com/docs/atlas/security-private-endpoint/) if it matters for your use case.
4. **Database** → **Connect** → **Drivers** → copy the `mongodb+srv://...` connection string. This is `MONGODB_URI`.
5. Test it locally first: paste it into `server/.env` as `MONGODB_URI=...`
   (unquoted, one line — that file is git-ignored, so your secret never gets
   committed). The server auto-loads `server/.env` on `npm run dev`/`start`,
   so just run `npm run dev` in `server/` and read the startup log:
   - `… accounts in MongoDB (serendib_learn)` → **connected to Atlas.** On a
     brand-new cluster you'll also see `Seeded a fresh database (MongoDB:
     serendib_learn)` the first time.
   - `… accounts in ./data/db.json` → the URI **wasn't** picked up and it fell
     back to the local JSON file. Check the variable name is exactly
     `MONGODB_URI` and the value isn't wrapped in quotes.

## 2. Google Cloud (Cloud Run + Artifact Registry)

*In short: this is where your API (the backend that handles logins,
bookings, etc.) actually runs. The commands below are all one-time setup —
run each block once, in order, in a terminal. You'll need to install the
`gcloud` command-line tool first if you don't have it
([instructions here](https://cloud.google.com/sdk/docs/install)), then run
`gcloud auth login` to sign in and `gcloud projects create` (or pick an
existing project in the [console](https://console.cloud.google.com/)) before
starting.*

Requires the `gcloud` CLI, authenticated (`gcloud auth login`), with a project selected.

```bash
export PROJECT_ID=your-project-id   # gcloud config set project $PROJECT_ID
export REGION=us-central1           # or whichever region you prefer
gcloud config set project $PROJECT_ID

# APIs this needs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com secretmanager.googleapis.com

# Where images get pushed
gcloud artifacts repositories create serendib \
  --repository-format=docker --location=$REGION \
  --description="Serendib Learn images"
```

### Workload Identity Federation (lets GitHub Actions deploy without a stored key)

```bash
export GITHUB_REPO="your-github-username/serendib-learn"  # owner/repo, exact

gcloud iam service-accounts create serendib-deployer \
  --display-name="Serendib Learn CI/CD"

export SA_EMAIL="serendib-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

for ROLE in roles/run.admin roles/artifactregistry.writer \
            roles/iam.serviceAccountUser roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" --role="$ROLE"
done

gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github/attribute.repository/${GITHUB_REPO}"

# The value deploy-backend.yml needs as GCP_WORKLOAD_IDENTITY_PROVIDER:
gcloud iam workload-identity-pools providers describe github \
  --location=global --workload-identity-pool=github --format="value(name)"
```

### Secrets the API needs (Secret Manager, not plain env vars)

```bash
echo -n "mongodb+srv://user:pass@cluster.mongodb.net" | \
  gcloud secrets create MONGODB_URI --data-file=-
echo -n "your-google-oauth-client-id" | \
  gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "your-google-oauth-client-secret" | \
  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
# Optional — only if you want CAPTCHA on signup/waitlist (step 6 below):
echo -n "your-turnstile-secret-key" | \
  gcloud secrets create TURNSTILE_SECRET_KEY --data-file=-

for SECRET in MONGODB_URI GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET TURNSTILE_SECRET_KEY; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${SA_EMAIL}" --role=roles/secretmanager.secretAccessor
done

# The deploy step above only covers the *deployer* identity (${SA_EMAIL}),
# which performs the deploy action. The *running container* reads secrets
# as a different identity — GCP's default Compute service account — and
# needs the same role or the deploy fails with "Permission denied on
# secret" even though the deployer already has access:
export RUNTIME_SA="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
for SECRET in MONGODB_URI GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET TURNSTILE_SECRET_KEY; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor
done
```

If you skip Turnstile, skip creating that secret too — and leave
`deploy-backend.yml`'s `secrets:` block as-is (it doesn't reference
`TURNSTILE_SECRET_KEY`); add a `TURNSTILE_SECRET_KEY=TURNSTILE_SECRET_KEY:latest`
line there only once the secret actually exists, since Cloud Run fails the
deploy outright if a referenced secret doesn't.

(Update a secret later with `echo -n "new-value" | gcloud secrets versions add MONGODB_URI --data-file=-`.)

### First deploy (so the service exists before Actions targets it)

```bash
gcloud run deploy serendib-api --region=$REGION \
  --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/serendib/api:bootstrap" \
  --allow-unauthenticated --port=4000 \
  --min-instances=0 --max-instances=3 \
  --no-image  # placeholder — GitHub Actions pushes the real image on first CI run
```

If `--no-image` isn't accepted by your `gcloud` version, just let the deploy
workflow's first run create the service — `deploy-cloudrun` creates it if it
doesn't exist yet, given the right permissions (already granted above).
`deploy-backend.yml`'s deploy step already passes
`flags: --allow-unauthenticated`, so every deploy (including this
auto-created first one) stays publicly reachable — without it the service
403s every request, since a fresh Cloud Run service requires auth by
default and `deploy-cloudrun` doesn't set that flag on its own.

Note the resulting URL (`https://serendib-api-xxxxx.<region>.run.app`), or
better, map a custom domain to it (**Cloud Run → Manage Custom Domains**) —
e.g. `api.yourdomain.com` — so the URL you register with Google's OAuth
consent screen (below) never changes if you ever redeploy under a new
service name.

## 3. Google Sign-in, Calendar and Gmail

*In short: this is a different Google setup from step 2 — step 2 was about
where the API's code runs, this is about the "Sign in with Google" button,
tutors' Calendar/Meet links, and the site's outgoing email. All three are
optional — the site works without them, just with less automation. Same
Google Cloud project as step 2.*

Full walkthrough already in `server/README.md`'s "Google: sign-in, Calendar,
Meet and Gmail" section — same steps, just use your Cloud Run/custom-domain
URL instead of `localhost:4000` for the redirect URI, e.g.:

```
https://api.yourdomain.com/api/integrations/google/callback
```

Once you have real users, submit the OAuth consent screen for verification
(same section) — `calendar.events` and `gmail.send` are both sensitive
scopes, and an unverified app caps out at 100 test users.

## 4. Vercel (frontend)

*In short: this is the actual website people visit. Easiest step by far —
Vercel is built specifically for Next.js sites like this one, so most of it
is clicking a couple of buttons, not running commands.*

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo. Vercel
   auto-detects Next.js at the repo root — no config needed. If the repo is
   **private** and you (the pusher) aren't literally the owner of the
   Vercel team/account, the Hobby (free) plan blocks every deploy with
   "the commit author did not have contributing access" — Hobby doesn't
   support collaborators deploying to a private repo at all, regardless of
   GitHub permissions. Either make the repo public (fine as long as no
   real secret ever got committed — check with
   `git log --all -p -- '*.env*'`, `server/.env` itself should never show
   up since it's git-ignored) or upgrade to Pro.
2. **Settings → Environment Variables**, add for Production (and Preview, if
   you want previews to work against the real API):
   - `NEXT_PUBLIC_API_URL` = your Cloud Run URL or custom API domain
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = the same client id as the API's
     `GOOGLE_CLIENT_ID` — add it as type **Config**, not **Secret**. Vercel
     warns about `NEXT_PUBLIC_*` secrets because they ship to the browser,
     but that's correct here: OAuth client IDs aren't sensitive, they're
     visible in every sign-in request anyway. Only the Client *Secret*
     (`GOOGLE_CLIENT_SECRET`, API-side only, in Secret Manager) must stay
     out of any `NEXT_PUBLIC_*` var.
3. **Settings → Domains** → add your custom domain, follow Vercel's DNS instructions.
4. Every push to `main` deploys to production automatically; every PR gets its
   own preview URL. Nothing in this repo's GitHub Actions touches this —
   it's entirely Vercel's own integration. `NEXT_PUBLIC_*` vars are baked in
   at build time — adding/changing one in Settings has no effect until the
   next deploy, so trigger a manual Redeploy after editing one instead of
   assuming it took effect immediately.

Preview deployments get a different URL every time, which won't be in the
API's `CORS_ORIGINS` — previews will build fine but API calls from them will
be blocked by CORS. That's expected unless you point previews at a separate
staging API.

`next.config.ts`'s `output: "standalone"` (for the Docker image) is gated
on `!process.env.VERCEL` — Vercel sets `VERCEL=1` on every build it runs.
Leaving it unconditional breaks Vercel's build with
`ENOENT: .next/next-server.js.nft.json`, because Vercel does its own file
tracing/bundling and the two collide. If you ever see that exact error on a
Vercel build, this is almost certainly why.

## 5. GitHub Secrets & Variables

**Settings → Secrets and variables → Actions.**

| Name | Type | Value |
| --- | --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Secret | Output of the `providers describe` command above |
| `GCP_SERVICE_ACCOUNT` | Secret | `serendib-deployer@<project-id>.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | Variable | Your GCP project id |
| `GCP_REGION` | Variable | e.g. `us-central1` |
| `APP_URL` | Variable | Your Vercel custom domain, e.g. `https://serendiblearn.com` — **no trailing slash** |
| `API_URL` | Variable | Your Cloud Run URL/custom domain, e.g. `https://api.serendiblearn.com` — **no trailing slash** |

The no-trailing-slash part matters more than it looks: `APP_URL` also
becomes `CORS_ORIGINS` (see `deploy-backend.yml`), and browsers never send
a trailing slash in the `Origin` header on a cross-origin request. The CORS
check is an exact string match, so a stray `/` at the end makes it silently
reject every real request from your frontend — no error in the browser
console pointing at the cause, it just looks like every API call fails.

`MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are **not** GitHub
secrets — they live in Google Secret Manager (step 2) and Cloud Run reads
them directly, so a compromised GitHub Actions run never sees their values.

Also create a GitHub **environment** named `production` (**Settings →
Environments**) — `deploy-backend.yml` targets it, which gives you the
option to require a manual approval before it runs, if you want one.

## 6. Local Docker Compose

For running the whole stack in one command without installing Node — see
the comment at the top of `docker-compose.yml`. Not the deployment path
above, just a convenience.

```bash
docker compose up --build
```

## Go-live checklist

- [ ] Atlas cluster created, network access allows Cloud Run, connection string saved
- [ ] Artifact Registry repo + Cloud Run service created
- [ ] Workload Identity Federation set up, GitHub can auth without a stored key
- [ ] `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in Secret Manager, **both** the deployer service account and the default Compute (runtime) service account can read them — granting only one causes a "Permission denied on secret" deploy failure
- [ ] Cloud Run service allows unauthenticated invocations (`deploy-backend.yml` sets `--allow-unauthenticated` on every deploy) — otherwise every real request 403s
- [ ] `APP_URL`/`API_URL` GitHub variables have **no trailing slash** — a trailing slash silently breaks CORS for the real frontend
- [ ] Cloud Run has a stable URL (custom domain mapped, or you're fine with the `*.run.app` one)
- [ ] Google Cloud project: Calendar API + Gmail API enabled, OAuth consent screen configured, redirect URI set to the Cloud Run URL
- [ ] GitHub secrets/variables from the table above are set
- [ ] GitHub environment `production` exists
- [ ] Vercel project created, env vars set, custom domain attached
- [ ] `DEMO_MODE=false` in the API's deployed env (already set in `deploy-backend.yml`)
- [ ] `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` in the API's deployed env (already set) — required because Vercel and Cloud Run are different domains
- [ ] (optional) Cloudflare Turnstile site created at [dash.cloudflare.com](https://dash.cloudflare.com/?to=/:account/turnstile) if you want CAPTCHA on signup/waitlist — `TURNSTILE_SECRET_KEY` as a Cloud Run secret, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a Vercel env var. Skipping this just means no CAPTCHA, same as local dev today.
- [ ] Push to `main` → CI runs → deploy workflow runs → visit your domain
