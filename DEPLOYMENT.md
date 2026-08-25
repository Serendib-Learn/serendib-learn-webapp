# Deploying Serendib Learn

Target architecture:

| Piece | Where | Why |
| --- | --- | --- |
| Next.js site | Vercel, custom domain | Native Next.js builds, zero-config previews |
| Express API | Google Cloud Run | Fully managed containers, scales to zero, no server to patch |
| Database | MongoDB Atlas (free tier) | Managed, works from anywhere, no disk to provision |
| CI | GitHub Actions (`ci.yml`) | Lint + typecheck + build on every push/PR, both apps |
| CD | GitHub Actions (`deploy-backend.yml`) | Builds the API image and deploys it to Cloud Run on push to `main` |

Vercel deploys the frontend itself via its own GitHub integration — there is
no frontend deploy workflow in `.github/workflows/`, and there shouldn't be
one; it would just be reimplementing what Vercel already does natively.

Do these roughly in order — Atlas first, since Cloud Run needs a connection
string; Google Cloud next; Vercel last, since it needs the API's live URL.

## 1. MongoDB Atlas

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and a new **M0 (free)** cluster.
2. **Database Access** → add a database user with a generated password (save it).
3. **Network Access** → add `0.0.0.0/0`. Cloud Run has no fixed outbound IP to
   allowlist instead — the connection is still authenticated and TLS-encrypted,
   just not IP-restricted. Tighten this later with [Private Service Connect](https://www.mongodb.com/docs/atlas/security-private-endpoint/) if it matters for your use case.
4. **Database** → **Connect** → **Drivers** → copy the `mongodb+srv://...` connection string. This is `MONGODB_URI`.
5. Test it locally first: put it in `server/.env` and run `npm run dev` in `server/` — the startup log should say `Seeded a fresh database (MongoDB: serendib_learn)`.

## 2. Google Cloud (Cloud Run + Artifact Registry)

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

Note the resulting URL (`https://serendib-api-xxxxx.<region>.run.app`), or
better, map a custom domain to it (**Cloud Run → Manage Custom Domains**) —
e.g. `api.yourdomain.com` — so the URL you register with Google's OAuth
consent screen (below) never changes if you ever redeploy under a new
service name.

## 3. Google Sign-in, Calendar and Gmail

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

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo. Vercel
   auto-detects Next.js at the repo root — no config needed.
2. **Settings → Environment Variables**, add for Production (and Preview, if
   you want previews to work against the real API):
   - `NEXT_PUBLIC_API_URL` = your Cloud Run URL or custom API domain
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = the same client id as the API's `GOOGLE_CLIENT_ID`
3. **Settings → Domains** → add your custom domain, follow Vercel's DNS instructions.
4. Every push to `main` deploys to production automatically; every PR gets its
   own preview URL. Nothing in this repo's GitHub Actions touches this —
   it's entirely Vercel's own integration.

Preview deployments get a different URL every time, which won't be in the
API's `CORS_ORIGINS` — previews will build fine but API calls from them will
be blocked by CORS. That's expected unless you point previews at a separate
staging API.

## 5. GitHub Secrets & Variables

**Settings → Secrets and variables → Actions.**

| Name | Type | Value |
| --- | --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Secret | Output of the `providers describe` command above |
| `GCP_SERVICE_ACCOUNT` | Secret | `serendib-deployer@<project-id>.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | Variable | Your GCP project id |
| `GCP_REGION` | Variable | e.g. `us-central1` |
| `APP_URL` | Variable | Your Vercel custom domain, e.g. `https://serendiblearn.com` |
| `API_URL` | Variable | Your Cloud Run URL/custom domain, e.g. `https://api.serendiblearn.com` |

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
- [ ] `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in Secret Manager, service account can read them
- [ ] Cloud Run has a stable URL (custom domain mapped, or you're fine with the `*.run.app` one)
- [ ] Google Cloud project: Calendar API + Gmail API enabled, OAuth consent screen configured, redirect URI set to the Cloud Run URL
- [ ] GitHub secrets/variables from the table above are set
- [ ] GitHub environment `production` exists
- [ ] Vercel project created, env vars set, custom domain attached
- [ ] `DEMO_MODE=false` in the API's deployed env (already set in `deploy-backend.yml`)
- [ ] `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` in the API's deployed env (already set) — required because Vercel and Cloud Run are different domains
- [ ] (optional) Cloudflare Turnstile site created at [dash.cloudflare.com](https://dash.cloudflare.com/?to=/:account/turnstile) if you want CAPTCHA on signup/waitlist — `TURNSTILE_SECRET_KEY` as a Cloud Run secret, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a Vercel env var. Skipping this just means no CAPTCHA, same as local dev today.
- [ ] Push to `main` → CI runs → deploy workflow runs → visit your domain
