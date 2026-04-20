# launch checklist — the gates between here and copula on the stores

Every item below is either something a human has to do in the real world
(open an account, click submit, sign a document) or something the code
isn't responsible for. This is the list that gets you from a clean
production build to an app live on the App Store + Google Play.

**Status as of the latest commit:**

- ✅ `npm run build` passes end-to-end, no TypeScript errors, all routes
  compile to production output.
- ✅ Dev server runs locally with real Postgres + seeded data; every
  route returns 200; see `docs/demo.md`.
- ✅ Security audit findings fixed (SSRF, ledger races, webhook hardening).
- ✅ Encryption at rest for Patreon tokens via AES-256-GCM.
- ✅ Legal starter docs (`docs/privacy-policy.md`, `docs/terms.md`).

What still needs doing, in dependency order:

---

## 1. ownership decisions · blocking · ~1 day with the right people in the room

None of these are technical. All block launch.

- [ ] Register the **Patreon OAuth client** under an owner account
      (Ebril personally, UMG, or a company entity). Note the client id +
      secret + webhook secret.
- [ ] Decide who owns the **Stripe account** that processes point packs
      and cash-bought merch. Revenue flows there.
- [ ] Register / transfer the **`copula.ebril.com`** domain (or whichever
      host you pick) to the same entity.
- [ ] Create / assign an **Apple Developer team** (individual = $99/yr;
      company = $99/yr + D-U-N-S verification, takes 1–3 weeks).
- [ ] Create / assign a **Google Play Console** account ($25 one-time).
- [ ] Name the **on-call rotation** (minimum: one person who handles a
      down-server at 3am).

Document all of the above in a 1-pager titled *copula ownership* before
moving to step 2.

---

## 2. content seed · ~3 days of Ebril's time over a week

This is what the letter to Ebril asks for (`docs/for-ebril.md`). Until it's
done, the app feels like a demo to real fans.

- [ ] **Real lyrics** for every track on *In Copula*, admin-entered
      at `/admin/songs` → each song → lyrics textarea (blank line between
      verses).
- [ ] **A note from Ebril** under each lyric page (the italic "from me"
      block).
- [ ] **First moment post**, pinned. `/admin/moments`, one paragraph.
- [ ] **First voice note.** Upload the audio anywhere reachable (S3 /
      Vercel Blob / Cloudflare R2). Paste the URL into `/admin/notes`
      along with a caption + duration. Tier-gated for supporters.
- [ ] **First listening ritual.** `/admin/rituals`. Specific track,
      window, one-line note.
- [ ] **3 Pinterest boards** — one per active direction. Use
      `/admin/directions/<id>` → moodboard panel. Either paste pin URLs
      one at a time or use the batch textarea.
- [ ] **TikTok sound URL + caption template** per direction. Same admin
      page. Without these the clips don't spread.
- [ ] **Licensed press photography** dropped into `public/assets/artist/`
      with per-file license rows in the adjacent `LICENSE.md`.

---

## 3. legal · ~1 week elapsed (mostly waiting on counsel)

- [ ] Send `docs/privacy-policy.md` + `docs/terms.md` to Canadian counsel
      (PIPEDA + Quebec's Law 25 apply depending on audience distribution).
- [ ] Publish the reviewed versions at `/privacy` and `/terms` (simple
      static routes — I can add them in one commit when you want).
- [ ] Set up two real mailboxes: `privacy@ebril.com` and
      `support@ebril.com`. Both are referenced in the docs and will be
      hit by both fans and Apple / Play reviewers.

---

## 4. infrastructure · ~half a day with the right accounts

- [ ] **Production Postgres**. Recommend Neon (free tier fine pre-launch;
      ~$20/mo after growth). Copy the connection string into
      `DATABASE_URL`.
- [ ] **Vercel project**. Import this git repo, set the branch to
      `main` (or whichever), paste every env var from the HANDOFF's
      required list. Deploy.
- [ ] Run the baseline seed against production (`npx prisma db push` +
      `npx tsx prisma/seed.ts`). **Do not run `seed-demo.ts` in prod.**
- [ ] Turn **off** `DEMO_MODE`. Double-check. The demo sign-in endpoint
      fails closed (404) when `DEMO_MODE !== "1"`, but grep your env
      anyway.
- [ ] Set **`ENCRYPTION_KEY`** to a fresh 32-byte value
      (`openssl rand -base64 32`). Without this, Patreon tokens sit in
      plaintext — a DB breach is full account takeover.
- [ ] Point DNS: `copula.ebril.com` → the Vercel deployment.
- [ ] Set `APP_BASE_URL=https://copula.ebril.com`.
- [ ] Register the Patreon OAuth redirect + webhook URLs against this
      domain.
- [ ] (Optional but recommended for push): generate VAPID keys
      (`npx web-push generate-vapid-keys`), set all three env vars.
- [ ] (Optional): Sentry project, Resend key, Stripe keys + webhook,
      Shopify storefront token.

---

## 5. native apps · ~2 days the first time, ~1 hour per update after

- [ ] On a Mac: `npx cap add ios && npx cap add android`. Commit the
      generated `ios/` and `android/` folders.
- [ ] Drop a licensed 1024×1024 `icon.png` at `docs/store-assets/`.
      Run `npx @capacitor/assets generate` (see `docs/publishing.md`).
      Generates every icon + splash variant.
- [ ] In Xcode: set team, bundle id `com.ebril.copula`, version. Enable
      signing, archive, upload to App Store Connect.
- [ ] In Android Studio: generate a signing keystore, **back up to
      1Password immediately**, build a signed `.aab`, upload to Play
      Console.
- [ ] Decide the **Apple IAP question** before submitting. The app
      currently uses Stripe for point packs — Apple's Guideline 3.1.1
      will almost certainly reject that on iOS. Two paths:
      - (a) Hide `/points/buy` inside the iOS Capacitor build via
            a feature flag, keep it web-only on iOS; Android is fine.
      - (b) Build a StoreKit-backed point-pack flow in parallel (~1
            engineering week of extra work).
      Document the choice before submission.

---

## 6. store listings · ~half a day

- [ ] Use the copy in `docs/store-listing.md` verbatim or tweak once.
- [ ] Fill in Apple's Privacy Nutrition Label; answers are pre-drafted
      in the same doc.
- [ ] Fill in Google Play's Data Safety form; same answers.
- [ ] Shoot + upload **5 screenshots per device size** (iPhone 6.7,
      Android phone). Follow the five-screenshot sequence in
      `docs/icons-and-screenshots.md`.
- [ ] Create the **1024×500 feature graphic** for Play.
- [ ] Set the **reviewer test account** — create a Patreon sandbox
      account, leave the creds in the App Store Connect reviewer notes
      field. Copy is in `docs/store-listing.md`.

---

## 7. beta · 2 weeks of real-human time

- [ ] TestFlight link out to 10–20 hand-picked real fans (not
      developers, not the team — real 3am listeners).
- [ ] Same group on Play internal test track.
- [ ] Watch `/admin/audit` + per-fan `/wrapped` pages at day 7.
      Measure: does anyone come back on day 3? on day 7? which three
      surfaces do they open most? what does the first support email
      actually say?
- [ ] Fix whatever day-3 retention falls off on *before* submitting
      to public review.

---

## 8. public submission · ~1 week of Apple + Play review

- [ ] Submit the iOS build for review. Prepare for one rejection
      cycle on IAP or privacy — both are the common ones. `docs/publishing.md`
      has the rejection playbook.
- [ ] Submit the `.aab` to Play Console's production track. Play
      review is typically 1–7 days.
- [ ] Once both are approved, flip Play to Production and hit
      "Release to App Store" on App Store Connect.

---

## 9. launch-day operations · half a day

- [ ] Cron jobs should already be scheduled via `vercel.json`. Verify
      by looking at Vercel's Cron panel after deploy.
- [ ] Run `/api/cron/tier-recalc` manually once with the bearer token
      to confirm the DB is healthy end-to-end.
- [ ] Send a test Patreon webhook event (the Patreon portal has a
      "test webhook" button) and confirm a `WebhookEvent` row lands.
- [ ] Send a Stripe test `checkout.session.completed` if you've set
      up Stripe. Confirm the ledger credit happens.
- [ ] Have the on-call person bookmark `/admin/audit` so they can
      watch the first day's traffic.

---

## what blocks *right now*

The single hardest gate is **Section 1 — ownership decisions**. Every
other item on this list depends on having an owner-of-record for at
least the Patreon client, the Stripe account, and the Apple + Play
teams. An hour with the right humans in a room unblocks six weeks
of downstream work.

If I could press one button from here, I'd press the "schedule that
meeting" button. I can't, but that's the thing.
