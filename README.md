# Ebril Rewards

Patreon-connected loyalty app for Ebril. See [`SPEC.md`](./SPEC.md) for the full product spec.

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma + Postgres
- Iron-session cookies for fan auth
- Patreon OAuth + webhooks

## Milestone status

- [x] **M1** — Patreon OAuth, pledge mirror, ledger schema, home screen balance/tier
- [x] **M2** — Tier cron, admin campaign CRUD, multiplier on charge
- [x] **M3** — Rewards catalog, redemption flow, admin queue, emails
- [x] **M4** — Streaks, birthday, referral, expiry warnings, audit log
- [x] **M5** — PWA, push notifications, analytics, load test
- [x] **M6** — Stripe path for non-Patreon fans (point packs + cash rewards)
- [x] **M7** — Dusk diary + listening rituals (music-fan loop)
- [x] **M8** — Spotify / YouTube / Shopify (click-out links + product grid)
- [x] **M9** — Capacitor wrap for iOS + Android, store listing pack

## Publishing to the App Store + Google Play

See `docs/publishing.md` for the full runbook. Short version:

```bash
npm install
npx cap add ios
npx cap add android
npm run build
npm run mobile:sync
npm run mobile:open:ios       # or :android
```

Supporting docs:

- `docs/store-listing.md` — names, descriptions, keywords in her voice.
- `docs/icons-and-screenshots.md` — asset spec + screenshot sequence.
- `docs/privacy-policy.md` and `docs/terms.md` — starter legal, needs counsel.

## Stripe setup

Fans without a Patreon subscription can still participate via Stripe:

- **Point packs** — admin CRUD at `/admin/point-packs`. Fans see packs on `/points/buy`; checkout redirects to Stripe and the webhook credits the ledger on `checkout.session.completed`.
- **Cash-buy rewards** — admins optionally set `cashPriceCents` on a reward; fans get an "Or buy for $X" button that runs Stripe checkout and creates a redemption (at `costPoints = 0`, notes = `Paid via Stripe <session>`).

After creating keys in the Stripe dashboard, point the webhook at `{APP_BASE_URL}/api/webhooks/stripe` and enable the `checkout.session.completed` event. Put the signing secret into `STRIPE_WEBHOOK_SECRET`.

## Load testing

Install [k6](https://k6.io) and run:

```bash
BASE_URL=https://staging.ebril.app \
COOKIE="ebril_session=..." \
REWARD_ID=<uuid> \
k6 run load/redemption.js
```

The scenario ramps to 100 RPS against `/api/redemptions` and asserts no
5xx errors plus p95 latency under 500ms. Use a content-unlock reward
with unlimited stock to isolate the ledger-write path; switch to a
limited-stock reward to verify there are no oversells.

## Getting started

```bash
cp .env.example .env
# fill in DATABASE_URL, PATREON_*, SESSION_SECRET
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## Patreon setup

1. Register an OAuth client at <https://www.patreon.com/portal/registration/register-clients>.
2. Set redirect URI to `{APP_BASE_URL}/api/auth/patreon/callback`.
3. Configure a webhook pointing at `{APP_BASE_URL}/api/webhooks/patreon` for `members:pledge:create`, `members:pledge:update`, `members:pledge:delete`, and `members:update`. Copy the secret into `PATREON_WEBHOOK_SECRET`.

## Ledger invariant

Points balance is always `SUM(point_transactions.delta)` where the row is not expired. There is no cached balance column — all credits, debits, and reversals are append-only rows. This makes reconciliation trivial and reversals safe.
