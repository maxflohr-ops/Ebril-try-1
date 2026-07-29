# publish-day runbook — copy, paste, ship

If you (Ebril) own every account, this is the two hours of real-world
clicking that gets copula deployed and submitted. Steps are in order;
some wait on external review (Apple = 1–3 days, Play = 1–7 days).

Every command assumes you're in the repo root on your Mac.

---

## 0 · fresh secrets (generated for you)

Do not reuse these if they've ever appeared in a chat log anywhere.
Regenerate on your own machine with the commands at the bottom of this
section and use those values instead. The ones below are only for your
first paste in case the regenerate step fails.

```
ENCRYPTION_KEY=buq3o0dKgK3y6dpDfm/mTfp7NoT8zlg333nGFz/aldw=
SESSION_SECRET=a0f95988f595870d5accec0a8bb8262b9f9a7bfdc732f75c29e22d99cddcbd3efd7632a58a5ba940881ae4e8d1e4a34f
CRON_SECRET=9aee446dd9fef0b2bba82c6406f063256f5c60dc3e30af4c8acc1f39803d7f4d
VAPID_PUBLIC_KEY=BEAVdf0lC-oY7IduQlUu6V5IU7vMACai7itDknHhlPFLhYHUAlLIjPScD2swj3UyE-QjptNWy9nb8GI0DB4ZfzY
VAPID_PRIVATE_KEY=_yzzR3yhNiThBoL6ytsyYLNyM6assQhBpNVlHZPNG6Q
VAPID_SUBJECT=mailto:privacy@ebril.com
```

To regenerate locally:

```bash
openssl rand -base64 32                 # ENCRYPTION_KEY
openssl rand -hex 48                    # SESSION_SECRET
openssl rand -hex 32                    # CRON_SECRET
npx web-push generate-vapid-keys        # VAPID_*
```

---

## 1 · database · 10 minutes

1. Sign up at [neon.tech](https://neon.tech), free tier.
2. Create a project called `copula`.
3. Copy the `DATABASE_URL` pooled connection string.
4. From your laptop, test the connection:

   ```bash
   DATABASE_URL="postgresql://…" npx prisma db push
   DATABASE_URL="postgresql://…" npx tsx prisma/seed.ts
   # do NOT run seed-demo.ts against production
   ```

---

## 2 · patreon oauth · 15 minutes

1. Go to [patreon.com/portal/registration/register-clients](https://www.patreon.com/portal/registration/register-clients).
2. Register a new OAuth client.
   - Name: `copula`
   - App Category: *Fan engagement*
   - Description: *a small room for ebril fans*
   - Icon: upload a 512×512 PNG (use the procedural `docs/store-assets/icon.svg` until you have real artwork)
   - Redirect URIs: `https://copula.ebril.com/api/auth/patreon/callback`
   - Client API Version: `2`
3. Save. Copy the **client id** and **client secret**.
4. In the same Patreon portal, go to the campaign's webhook settings:
   - URL: `https://copula.ebril.com/api/webhooks/patreon`
   - Events: `members:pledge:create`, `members:pledge:update`, `members:pledge:delete`, `members:update`
5. Copy the **webhook secret** Patreon displays.

---

## 3 · stripe · 15 minutes

Optional but recommended if you want the point-packs + cash-buy merch flows.

1. Sign into [dashboard.stripe.com](https://dashboard.stripe.com). Create
   an account if needed — you'll need to verify identity for live mode
   (~1 day).
2. In test mode first, go to **Developers → API keys**. Copy the
   **Secret key** (`sk_test_…`) for staging; regenerate a live one later.
3. Go to **Developers → Webhooks → Add endpoint**.
   - URL: `https://copula.ebril.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Copy the **signing secret** (`whsec_…`).
4. Note the Apple IAP question: your first App Store submission will
   almost certainly hit Apple Guideline 3.1.1 for the Stripe-backed
   point packs. See `docs/launch-checklist.md` § 5 for the two-path
   decision.

---

## 4 · vercel + domain · 20 minutes

1. Sign into [vercel.com](https://vercel.com) as the owner account.
2. **Import** this git repo. Framework preset: Next.js. Root directory:
   the repo root. Branch: the branch you want to deploy (recommend
   moving this onto `main` first with `git checkout -b main` +
   push-with-upstream-force-if-ok).
3. **Environment Variables** — paste these before the first deploy:

   **Required:**
   ```
   DATABASE_URL=<from step 1>
   APP_BASE_URL=https://copula.ebril.com
   SESSION_SECRET=<from step 0>
   ENCRYPTION_KEY=<from step 0>
   CRON_SECRET=<from step 0>
   ADMIN_PATREON_IDS=<your own patreon user id>
   PATREON_CLIENT_ID=<from step 2>
   PATREON_CLIENT_SECRET=<from step 2>
   PATREON_WEBHOOK_SECRET=<from step 2>
   ```

   **Optional (services no-op when blank):**
   ```
   STRIPE_SECRET_KEY=<from step 3>
   STRIPE_WEBHOOK_SECRET=<from step 3>
   RESEND_API_KEY=<resend.com key if you have one>
   EMAIL_FROM="copula <hello@ebril.com>"
   VAPID_PUBLIC_KEY=<from step 0>
   VAPID_PRIVATE_KEY=<from step 0>
   VAPID_SUBJECT=mailto:privacy@ebril.com
   SHOPIFY_STORE_DOMAIN=<shop.ebril.com>
   SHOPIFY_STOREFRONT_TOKEN=<storefront api token>
   SENTRY_DSN=<from sentry.io>
   NEXT_PUBLIC_SENTRY_DSN=<same as above>
   ```

   **Never set in prod:**
   ```
   DEMO_MODE     (leave unset; never "1")
   ```

4. **Deploy.** First build takes ~2 minutes.

5. **Add the domain:**
   - In Vercel → your project → Domains → Add `copula.ebril.com`.
   - Wherever `ebril.com` DNS lives, add the CNAME Vercel asks for.
   - Wait for DNS propagation (usually under 10 min).

6. **Register your own Patreon ID as admin.** The first time you sign
   into the app with Patreon, it'll create your User row. Check
   `User.patreonUserId` via Neon's SQL editor, then set it as
   `ADMIN_PATREON_IDS` in Vercel and redeploy.

---

## 5 · seed your first content · 30 minutes of your time

Now the app is live at `https://copula.ebril.com`. Sign in with Patreon
(your own account), then visit `/admin`.

- **`/admin/songs`** — paste real lyrics for *In Copula* + a note under each.
- **`/admin/moments`** — write + pin your first post.
- **`/admin/notes`** — paste the URL of a 30-second audio file + a caption.
  Host the file on Vercel Blob, S3, R2, Dropbox public link — anywhere.
- **`/admin/rituals`** — one listening ritual, tonight.
- **`/admin/directions`** — for each of the three seeded directions, open
  the detail page and add pin URLs, the tiktok sound URL, and the caption
  template.
- **`/admin/tour`** — real show dates.
- **`/admin/links`** — verify the seeded social links. Add or adjust.

Takes about 30 minutes if you have the content ready.

---

## 6 · push to the stores · half a day on your Mac

### iOS

```bash
# Prerequisites on your Mac:
#   Xcode 15+ (App Store)
#   cocoapods (brew install cocoapods)
#   An Apple Developer team ($99/yr; individual is fine)

git pull
npm install
cd ios/App && pod install && cd ../..
npm run build
npx cap sync ios
npx cap open ios        # launches Xcode
```

In Xcode:
1. Project → Signing & Capabilities → pick your team; bundle id stays
   `com.ebril.copula`; version `1.0.0`, build `1`.
2. Select "Any iOS Device" as the run destination.
3. Product → Archive → wait ~5 min.
4. Distribute App → App Store Connect → Upload.
5. In App Store Connect, fill in:
   - App name: **copula**
   - Subtitle: **ebril's world. come inside.**
   - Description: copy from `docs/store-listing.md`.
   - Keywords: also in that doc.
   - Screenshots: follow `docs/icons-and-screenshots.md`. 5 shots at
     1290×2796 (6.7" iPhone).
   - Privacy policy URL: `https://copula.ebril.com/privacy` (see § 8).
   - Reviewer notes: paste the "Store reviewer notes" block from
     `docs/store-listing.md` with a real Patreon sandbox email/password.
6. Submit for review. **If it comes back with Guideline 3.1.1 IAP**:
   either temporarily hide `/points/buy` in the iOS build (one feature-
   flag commit) or reply with a build that uses StoreKit. This is in
   `docs/publishing.md`.

### Android

```bash
npm run mobile:open:android
```

In Android Studio:
1. **Build → Generate Signed Bundle / APK → Android App Bundle.**
2. First time: create a new keystore. **Back up the keystore + password
   to 1Password immediately — losing it means losing the app.**
3. Build type: release.
4. Upload the `.aab` at Play Console → Production → Create new release.
5. Fill listing (same copy as iOS).
6. Fill Data Safety form (answers in `docs/store-listing.md`).
7. Submit for review.

---

## 7 · the screenshots · ~30 min

From your Mac with the dev server running:

```bash
node scripts/screenshot-demo.mjs
```

Outputs 14 PNGs into `demo-screens/`. Pick five that feel tightest —
home, wrapped, eras/dusk window, wall, collection — and upload them.

Alternatively, shoot real screenshots on a real iPhone after the app
ships to TestFlight; those always read better.

---

## 8 · `/privacy` and `/terms` pages · I'll add these for you

These aren't in the app yet as routes — the text lives in
`docs/privacy-policy.md` and `docs/terms.md`. The App Store submission
requires both at a real URL. Two options:

- Fastest: host both as markdown on a static route before submitting.
  Tell me when you want this and I'll add two files (`src/app/privacy/page.tsx`
  and `src/app/terms/page.tsx`) that render the markdown.
- Better: have counsel review + edit the text first, then publish the
  final versions.

---

## 9 · launch day · afternoon

1. Tweet the App Store + Play links.
2. Post a moment from `/admin/moments` — make it the first thing a new
   fan sees.
3. Watch `/admin/audit` for the first hour. First 100 sign-ins tell you
   everything: where people drop off, which button they miss, what
   breaks.
4. If the server goes down: Vercel → your project → Deployments → promote
   the last known-good build. Neon → Restore → point-in-time recovery is
   available on any paid tier.

---

## one thing to not forget

Before any of this, the app has never been touched by a real fan. Steps
1–5 can take a day. Step 7 (beta) should take *two weeks* before Step 6
(store submission) happens. If something about the copy, the loop, or
the first-open hits doesn't land for 10 fans, it won't land for 10,000.
