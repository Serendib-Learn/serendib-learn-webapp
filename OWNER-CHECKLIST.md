# Owner's checklist — launching Serendib Learn

Everything left that only the owners can do, in order. The code side is done;
each step says what to click, and where to hand over to Claude (the steps
marked **→ Claude**). Tick the boxes as you go.

*Written 29 October 2026. The background for each step is in `HANDBOOK.md` →
section 15, and the technical detail in `DEPLOYMENT.md`.*

**Already done:** Gmail sending and the Serendib calendar are connected,
branded emails are live, payments work in test mode, and `DEMO_MODE=false` is
set in `server/.env`.

---

## 1. Publish the Google consent screen — do this first (10 minutes)

**Why it's urgent:** while the app is in *Testing* mode, only listed test
users can sign in with Google or connect a calendar. The Gmail and calendar
connections made in Testing mode also **expire after 7 days (around
4 November)**. After that, emails stop going out and bookings stop getting
Meet links.

- [ ] Open [console.cloud.google.com](https://console.cloud.google.com), choose
      the project **serendib-learn**, then **APIs & Services → OAuth consent
      screen**. In the newer layout this is **Google Auth Platform → Audience**.
- [ ] Under *Publishing status: Testing*, press **Publish app** and confirm.
      Google says the app needs verification. That's expected: it publishes
      anyway, and people see an "unverified app" notice until step 5.
- [ ] Under **Branding**, check these fields:
  - App name: **Serendib Learn**
  - User support email: **serendib.learn@gmail.com**
  - App home page: `https://serendib-learn-webapp.vercel.app` (changes to
    serendiblearn.com in step 5)
  - Privacy policy: `https://serendib-learn-webapp.vercel.app/privacy`
- [ ] **Reconnect both Google connections**, so they get long-lasting access
      instead of 7-day access:
  - In the portal, go to **Admin → Google**.
  - Serendib calendar: **Disconnect**, then **Connect the Serendib calendar**,
    signing in as serendib.learn@gmail.com, then press **Make a test Meet
    link**.
  - Gmail: **Disconnect**, then **Connect Gmail**, then press **Send a test
    email** and check the inbox.

## 2. Move to serendiblearn.com (about 1 hour, plus waiting for DNS)

**Why:** right now the website (`…vercel.app`) and the API (`…run.app`) are
different domains, so **Safari, iPhones and private windows can't stay
logged in**. On `www.serendiblearn.com` + `api.serendiblearn.com` they work.

Have these logins open: **Namecheap** (where the domain is managed),
**Vercel**, **Google Cloud** (the account that owns serendib-learn) and
**Payments.lk**.

- [ ] **Vercel:**
  - Go to the project → **Settings → Domains**.
  - Add `serendiblearn.com` and `www.serendiblearn.com`. If asked, make `www`
    the main one and redirect the other to it.
  - Keep the page open: it shows the DNS records to add.
- [ ] **Prove to Google that you own the domain:**
  - Open [search.google.com/search-console](https://search.google.com/search-console),
    signed in as the Google account that owns the serendib-learn project.
  - Add a property → **Domain** → `serendiblearn.com`.
  - Google shows a **TXT** record. Keep it open.
- [ ] **Namecheap:** Domain List → **Manage** (serendiblearn.com) → **Advanced
      DNS** → **Add new record** → TXT, Host `@`, Value = Google's TXT value.
      Save, then press **Verify** in Search Console. It may take a few minutes.
- [ ] **→ Claude:** "domain verified". Claude connects `api.serendiblearn.com`
      to the API and confirms the record. It is normally a **CNAME**, Host
      `api`, value `ghs.googlehosted.com`.
- [ ] **Namecheap, Advanced DNS:**
  - **Delete** the records that point at the old site: the `@` URL-redirect
    or A record, and the `www` record pointing at the prototype
    (185.158.133.1).
  - **Add** the two records Vercel showed (usually an **A** record for `@` and
    a **CNAME** for `www`).
  - **Add** the `api` CNAME from the step above.
  - Leave the TXT record in place.
- [ ] **Vercel → Settings → Environment Variables** (Production):
  - `NEXT_PUBLIC_API_URL` = `https://api.serendiblearn.com`
  - `NEXT_PUBLIC_SITE_URL` = `https://www.serendiblearn.com`
  - Then go to **Deployments**, open the latest one, choose **⋯** →
    **Redeploy**.
- [ ] **Google Cloud → APIs & Services → Credentials →** your OAuth client
      (Web application). **Add**, without removing the old entries yet:
  - Authorised JavaScript origins: `https://www.serendiblearn.com`
  - Authorised redirect URIs:
    `https://api.serendiblearn.com/api/integrations/google/callback`
- [ ] **Payments.lk:** change the webhook address to
      `https://api.serendiblearn.com/api/payments/webhook`.
- [ ] **→ Claude:** "records added".
  - Claude updates the deploy settings (`APP_URL`, `API_URL`), redeploys the
    API, and waits for the padlock (HTTPS) on both addresses.
  - Claude then tests login on Safari, phone size and private windows, plus
    booking, emails and Google Connect.
  - DNS can take minutes to a few hours. The old prototype keeps showing until
    it switches, so nothing goes blank.

## 3. Terms of service and refund policy

Payments.lk and Google's review will both look for them. Only Privacy exists so
far.

- [ ] Send Claude your wording, or say **"draft it"**. Claude writes both pages
      from the rules the site already enforces, for you to approve, then adds
      them and links them in the footer. The rules are:
  - Moving a lesson is free, up to 24 hours before (tutors and admins any time
    before it starts).
  - A student cancelling a paid lesson is not refunded.
  - A tutor cancelling gives the student a free lesson.
  - Missed lessons and free-session requests are decided by the team.

## 4. Payments go live

- [ ] Get the **Payments.lk account approved** (they will likely check the
      Terms and refund pages).
- [ ] In Payments.lk, create the **live webhook** (address from step 2,
      events `payment.succeeded`, `payment.failed`, `checkout.expired`).
- [ ] **→ Claude:** "live keys ready". Claude walks you through storing the
      `sk_live_…` key and the `whsec_…` secret safely (never paste them in chat).
- [ ] Confirm the **rupee rate**: it is **300 rupees per US dollar** now.
- [ ] Make **one small real payment** end to end.

## 5. Google verification (removes the "unverified app" notice and the 100-user cap)

After step 2, and ideally step 3:

- [ ] **Branding:**
  - Home page `https://www.serendiblearn.com`
  - Privacy `https://www.serendiblearn.com/privacy`
  - Terms `https://www.serendiblearn.com/terms`
  - Under *Authorised domains*, add `serendiblearn.com`.
  - Upload the logo: `public/brand/serendib-icon.png` in the repo.
- [ ] **→ Claude:** "write the verification answers". Claude writes why the app
      needs Calendar and Gmail access, and a 2-minute video script.
- [ ] Record the video, upload it to YouTube as **Unlisted**, then press
      **Prepare for verification** / **Submit**. Google takes days to a few
      weeks. Everything keeps working meanwhile.

## 6. Tutors

- [ ] Send the **email addresses** for Nafha, Hajara, Savith and Hafsa to
      Claude, or add them yourself: **Admin → People → Add email & invite**.
- [ ] Send **Zeynab's and Amani's** descriptions and photos.
- [ ] Each tutor, after accepting the invite:
  - **Profile:** rate, specialties, photo.
  - **Calendar → My hours:** weekly hours.
  - Optionally **Connect Google Calendar**.

## 7. Teaching content

- [ ] Tutors check both alphabet sheets in **Portal → Content → Alphabet
      sheets** and set each to **Checked by a tutor** (both are *draft* now).
- [ ] Tutors record the Sinhala letters on **/alphabet → Record
      pronunciations** (none recorded yet).
- [ ] **Add the 2027 holidays** in **Portal → Content → Holidays** before
      January. The list ends on 25 December 2026.

## 8. Backups

The MongoDB Atlas free tier keeps **no backups**.

- [ ] Either upgrade the cluster in Atlas (paid tiers have backups), **or tell
      Claude "set up backups"** for a daily automatic export to Google Cloud
      Storage.

## 9. Launch

- [ ] Once steps 1–4 are done, email the **6 people on the waitlist**
      (Admin → Waitlist) that you're open.
