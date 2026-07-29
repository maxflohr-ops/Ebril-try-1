# launch checklist — the gates between here and copula on the web

Every item below is either something a human has to do in the real world
(open an account, click submit, sign a document) or something the code
isn't responsible for. This is the list that gets you from a clean
production build to a live web app at `copula.ebril.com`.

**Scope as of this revision:** web app only. Mobile / native (Capacitor)
is parked — the scaffolds remain in `ios/` and `android/` for later, but
nothing in this checklist depends on them.

**Status as of the latest commit:**

- ✅ `npm run build` passes end-to-end, no TypeScript errors, all routes
  compile to production output.
- ✅ Dev server runs locally with real Postgres + seeded data; every
  route returns 200; see `docs/demo.md`.
- ✅ Security audit findings fixed (SSRF, ledger races, webhook hardening).
- ✅ Encryption at rest for Patreon tokens via AES-256-GCM.
- ✅ Legal starter docs (`docs/privacy-policy.md`, `docs/terms.md`).
- ✅ Minecraft integration (HTTP contract + Paper/Spigot plugin skeleton).
- ✅ Season pass (admin-moderated content → in-game rewards).

What still needs doing, in dependency order:

---

## 1. ownership decisions · blocking · ~1 day with the right people in the room

None of these are technical. All block launch.

- [ ] Register the **Patreon OAuth client** under an owner account
      (Ebril personally, UMG, or a company entity). Note the client id +
      secret + webhook secret.
- [ ] Register the **Microsoft Azure app** for Minecraft sign-in. Azure
      Portal → App registrations → New registration → consumer accounts
      ("Personal Microsoft accounts only"). Add redirect URI
      `https://copula.ebril.com/api/auth/minecraft-ms/callback`.
      Add scopes `XboxLive.signin offline_access`. Note client id +
      secret.
- [ ] Register the **Discord application** for Discord sign-in.
      Discord Developer Portal → New Application → OAuth2. Add redirect
      URI `https://copula.ebril.com/api/auth/discord/callback`. Note
      client id + secret.
- [ ] (Optional, for tier-role sync) On the same Discord application,
      add a **Bot**, copy its token, invite it to Ebril's server with
      the **Manage Roles** permission, and drag it *above* the tier
      roles in Server Settings → Roles. Copy the guild id + the four
      tier role ids (Discord → Developer Mode → right-click → Copy ID)
      into `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and
      `DISCORD_ROLE_UNRANKED/_FAN/_SUPERFAN/_VIP`. Unset = silent
      no-op; the OAuth link still works without it.
- [ ] Decide who owns the **Stripe account** that processes point packs
      and cash-bought merch. Revenue flows there.
- [ ] Register / transfer the **`copula.ebril.com`** domain (or whichever
      host you pick) to the same entity.
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

## 5. PWA polish · ~half a day

The app is already a PWA (manifest + service worker). Nothing here is
strictly required for launch, but each item makes the "add to home
screen" experience feel native enough that fans don't ask for the App
Store version.

- [ ] Drop the licensed 1024×1024 `icon.png` at `public/`. The manifest
      already references it.
- [ ] Confirm `public/manifest.webmanifest` has the right `name`,
      `short_name`, `theme_color`, and `background_color`.
- [ ] iOS Safari fans: long-press the URL bar → "add to home screen"
      lands a full-screen PWA. Document this in `/welcome` copy.
- [ ] Android Chrome: the install prompt fires automatically — no
      action needed.
- [ ] If you want a one-tap install on desktop, the BeforeInstallPromptEvent
      handler can surface a copula-branded install button. Not built;
      ~1 hour if you want it.

> **Mobile / native shells were intentionally cut.** `ios/` and
> `android/` directories remain in the repo for future use; nothing
> in this checklist depends on them. If you ever do want a wrapped
> native app, the path lives at `docs/publishing.md`.

---

## 6. beta · 2 weeks of real-human time

- [ ] Hand the URL out to 10–20 real fans (not developers, not the
      team — real 3am listeners).
- [ ] Watch `/admin/audit` + per-fan `/wrapped` pages at day 7.
      Measure: does anyone come back on day 3? on day 7? which three
      surfaces do they open most? what does the first support email
      actually say?
- [ ] Fix whatever day-3 retention falls off on *before* opening
      the gates wider.

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
other item on this list depends on having an owner-of-record for the
Patreon client, the Microsoft Azure app, the Discord application, and
the production domain. An hour with the right humans in a room
unblocks weeks of downstream work.

If I could press one button from here, I'd press the "schedule that
meeting" button. I can't, but that's the thing.
