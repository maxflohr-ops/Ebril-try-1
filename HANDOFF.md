# copula — handoff

Single entry point for Ebril's team. Three sections, one per audience. Everything
else in this repo is linked from here.

- **[For Ebril](#for-ebril)** — what the app is, what it needs from you before launch
- **[For managers / UMG](#for-managers--umg)** — what it is, what it costs, the risks
- **[For the technical team](#for-the-technical-team)** — how to run it, deploy it, own it

The code lives on branch **`claude/ebril-rewards-app-lpqY5`**. Latest build renders
and runs clean; see `docs/demo.md` to stand it up locally in five minutes.

---

## For Ebril

You have an app. It's called **copula**. It's *your world*, not a storefront —
it's for the people already inside your songs.

### What's in it, in your words

- **moments** — short posts from you, like instagram close friends. fans heart
  them. that's the daily reason to open.
- **dusk diary** — a private place for fans to write what a song made them feel.
  mood chips, one page a day earns a little.
- **rituals** — you set a listening moment ("tonight at dusk, press play on
  stranger in you"). they claim it. something warm lands.
- **voice notes** — half-minute audio from you. tier-gated for supporters, or
  open.
- **eras + directions** — your clipping world. you post a direction (*"film the
  view from your window right before it goes dark"*) with a pinterest moodboard
  + a tiktok sound + a caption to paste. fans make clips. the good ones land on
  **the wall**.
- **shows** — tour dates with qr check-ins at the merch table.
- **songs** — every track with its own page: lyrics, a note from you, links to
  spotify/apple/youtube/bandcamp that open the real apps on mobile.
- **collection** — cassettes fans earn for moments (first sign-in, first clip
  held, seven dusk pages, etc). persistent, not for sale.
- **wrapped** — a weekly recap in your voice.
- **gift** — fans send each other points with a note.
- **vibe test** — a 5-question quiz anyone can take without signing in, ends
  with a song rec and invites them in.

### What the app *sounds* like

Everything is lowercase. Copy is unhurried. Error states are in your voice:
*"not quite enough yet — keep going."* Fans "keep" things rather than "save"
them. Clips get "kept · held · carried" instead of "approved · featured · viral."
The three mood keywords behind every screen: **dusk, intimate, rooted**.

If anything reads off-voice to you, it's a one-line fix — tell us where.

### What you need to seed before launch

This is the non-negotiable list. Until these land, the app feels like a demo.

- [ ] **lyrics** for every song on *In Copula* — the admin at `/admin/songs`
      has a lyrics textarea; split verses with a blank line.
- [ ] **a note from you** under each song (the italic block on the lyric page).
- [ ] **3–5 pinterest boards** — one per active clipping direction. the admin
      at `/admin/directions/<id>` accepts pin URLs or a batch-paste of pin
      urls; fans see them as a moodboard before they film.
- [ ] **your first voice note** — a 30-second audio file. any mp3/m4a URL
      works. this is the single biggest hook for supporters.
- [ ] **your first moment post** — one short paragraph in your voice. pin it.
      this is the first thing a new fan sees.
- [ ] **one listening ritual** — a specific track at a specific hour, a line
      from you about what to do.
- [ ] **tiktok sound URLs + caption templates** for each direction — critical
      for the clips to actually spread.
- [ ] **your real press photos** — commit to `public/assets/artist/` with
      license metadata; these replace the dicebear placeholders in the demo.

Your team has admin access via `ADMIN_PATREON_IDS`. Everything above is a
form, not a ticket.

### How to see it right now

Run:

```
git checkout claude/ebril-rewards-app-lpqY5
# follow docs/demo.md
```

Pick **hana** on `/demo` for the fullest tour.

---

## For managers / UMG

### What copula is

A free native iOS + Android app (plus a PWA) for Ebril fans. Built around
**engagement**, not paywalls — every core feature works without any purchase.
Supporters on Patreon earn points that unlock tier-gated content. Stripe
handles optional point-pack top-ups and cash-priced merch. Shopify handles
the physical store.

### Business model in one breath

1. Patreon is the subscription rail. Copula makes a Patreon pledge feel like
   something besides a bank transfer.
2. Points are a loyalty currency backed by a ledger. Fans earn them by
   pledging, writing diary pages, making clips, showing up at shows. They
   spend them on rewards (signed items, 1:1 calls, content unlocks, merch).
3. The clipping system (fans making TikToks for Ebril under specific
   creative direction) is the virality engine. Tiered reward ladder
   (kept / held / carried) with view-count thresholds.
4. The app itself is free. Optional: point packs (Stripe), cash-buy merch
   (Stripe → physical fulfillment), Shopify storefront.

### Risks — in descending order of urgency

1. **App Store IAP policy.** The point-pack flow uses Stripe, which Apple may
   reject under Guideline 3.1.1. Mitigation is documented in
   `docs/store-listing.md` — the cleanest path is to hide point-packs from
   the native iOS build at launch and run them web-only. Android is less
   strict. This is a real blocker if unaddressed; ~1 week of rework if we
   hit it.
2. **Privacy / legal.** The app collects email, Patreon id, diary entries
   (private by default), shipping addresses on redemption. Patreon OAuth
   tokens are encrypted at rest. Starter privacy policy + terms at
   `docs/privacy-policy.md` and `docs/terms.md` — **needs Canadian
   counsel review before publish.**
3. **Moderation burden.** Fan clips require human review — Ebril or her team
   needs to spend ~10 minutes a day in `/admin/clips`. Not automated; this
   is intentional (moderated reward > algorithmic reward for her brand) but
   it is a recurring cost.
4. **Patreon dependency.** Sign-in is Patreon-only today. If Patreon changes
   their OAuth or terms, we're exposed. No mitigation planned for v1 —
   Patreon is also the subscription revenue, so decoupling would be a
   larger strategic decision.
5. **Likeness / photography rights.** `public/assets/artist/LICENSE.md`
   tracks every image; strict policy of no unlicensed photos shipped.

### What it costs to run

- **Hosting**: Vercel (~$20/mo until usage warrants a Pro plan).
- **Database**: Neon Postgres free tier (~$0 at current scale; ~$20/mo if
  the fan base grows past a few thousand).
- **Email**: Resend (pay-per-send, pennies).
- **Push**: free (Web Push + VAPID).
- **Sentry**: free tier sufficient.
- **Stripe / Shopify**: standard percentages on revenue only.
- **Total baseline fixed cost**: <$50/mo at pre-launch scale.

### Timeline to public launch

Assuming Ebril can seed the content list above and counsel reviews the
legal docs:

| Phase | Length | What happens |
|---|---|---|
| **Content seed + legal review** | 1 week | Ebril + team fill in the seed checklist; counsel reviews privacy/terms |
| **Closed beta** | 2 weeks | 10–20 real fans, invite only; we watch retention and which surfaces they use |
| **App Store submission** | 1 week | iOS + Android review cycles (1–3 days typical; longer if IAP rejection hits) |
| **Public launch** | — | Roll out via Ebril's existing channels |

### Ownership questions that need answering

- Who owns the Patreon OAuth client? (Currently TBD.)
- Who owns the Stripe account? (Revenue flows there.)
- Who owns the `copula.ebril.com` domain?
- Who owns the Apple Developer + Google Play accounts?
- Who is on-call when the server is down?

These are not technical decisions; they're contractual ones. Blocking for
launch.

---

## For the technical team

### What to read first

1. `README.md` — stack + milestone map.
2. `docs/demo.md` — stand up a full demo locally in five minutes.
3. `docs/publishing.md` — iOS + Android submission runbook.
4. `docs/store-listing.md` — App Store + Play copy.
5. `docs/icons-and-screenshots.md` — asset spec.
6. `docs/privacy-policy.md` + `docs/terms.md` — legal starters.
7. `SPEC.md` — the original product spec, still mostly accurate.

### Stack summary

- **Framework**: Next.js 14 App Router + TypeScript.
- **DB**: Postgres via Prisma.
- **Auth**: Patreon OAuth, iron-session cookies (30-day TTL).
- **Payments**: Stripe (point packs + cash-buy rewards); Shopify Storefront
  API for physical merch.
- **Email**: Resend (optional, no-ops when unset).
- **Push**: Web Push via VAPID (optional, no-ops when unset).
- **Native**: Capacitor 6 wraps the hosted web app — server stays Next,
  native shell is a trusted webview.
- **Observability**: Sentry (optional, no-ops when unset).
- **Hosting target**: Vercel + Neon Postgres (recommended).
- **Cron**: Vercel Cron, paths in `vercel.json`.

### What's done (at the latest commit)

12 milestones, M1–M12 plus onboarding, gift, wrapped, demo mode,
encryption at rest, SSRF guard. See `README.md` for the feature list.

### What's not done (known)

- Real fan beta — **no human has used this yet.**
- Apple IAP path for point-packs (see risk #1 above).
- Rate limiting is in-process; on multi-instance deploys it's permissive.
  Swap for `@upstash/ratelimit` before going past a single Vercel region.
- Placeholder PWA icons (`/icon-192.png`, `/icon-512.png`) still reference
  placeholder filenames — commission real artwork.
- Native iOS + Android projects aren't generated yet; run `npx cap add ios`
  and `npx cap add android` once you're ready.
- No automated test suite. The Stripe refund idempotency, ledger row
  uniqueness, SSRF guard, and Patreon signature check all have manual
  verification notes in their commit messages but no test coverage.

### Environment checklist for production

Required:

- `DATABASE_URL` — Postgres connection string
- `APP_BASE_URL` — e.g. `https://copula.ebril.com`
- `SESSION_SECRET` — ≥32 random bytes
- `ADMIN_PATREON_IDS` — comma-separated list
- `CRON_SECRET` — shared secret for `/api/cron/*`
- `PATREON_CLIENT_ID` + `PATREON_CLIENT_SECRET` + `PATREON_WEBHOOK_SECRET`
- `ENCRYPTION_KEY` — 32 bytes, **this one is non-negotiable in prod**

Optional (features no-op gracefully when unset):

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Shopify: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN`
- Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- Sentry: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`,
  `SENTRY_ORG`, `SENTRY_PROJECT`

**NEVER set in prod**: `DEMO_MODE`. There's a 404 fail-closed check, but
double-check anyway.

### Operational surface

- **Cron jobs** (scheduled in `vercel.json`):
  - `/api/cron/tier-recalc` — nightly at 03:00 UTC
  - `/api/cron/daily` — 14:00 UTC (birthday / streak / expiry warnings)
  - `/api/cron/expire-points` — 03:30 UTC (currently a no-op by design;
    point expiry is derived from `expiresAt` on ledger rows)
  - `/api/cron/patreon-reconcile` — 04:00 UTC (pulls fresh membership
    data for every connected fan)
  - `/api/cron/drop-notify` — 16:00 UTC (release-day push fan-out)
  - `/api/cron/inspiration-sync` — 05:00 UTC (pulls Pinterest feeds into
    direction moodboards)
- **Webhooks**:
  - `POST /api/webhooks/patreon` — HMAC-MD5 verified, event-id deduped
  - `POST /api/webhooks/stripe` — stripe-signature verified, event-id
    deduped

### Access to hand over

Once ownership decisions are made (see managers section), transfer or
grant access to:

- The Patreon OAuth client (in Patreon's creator portal)
- The Stripe account + webhook endpoint
- The Shopify store + Storefront API token
- The domain DNS
- The Apple Developer team + Google Play Console
- Vercel + Neon projects
- This git repo

### What to do first

1. Spin up staging on Vercel + Neon. Point a branch at it.
2. Get legal to review `docs/privacy-policy.md` + `docs/terms.md`.
3. Resolve the IAP question with a decision, documented.
4. Run the beta with 10–20 handpicked fans. Watch `/admin/audit` and
   real-user `/wrapped` outputs on day 7 to see what's landing.

---

## Questions

`privacy@ebril.com` for privacy, `support@ebril.com` for everything else —
set these mailboxes up before publishing the store listing; they're
referenced in the legal docs and the store reviewer notes.
