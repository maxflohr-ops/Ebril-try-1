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
- [ ] **M3** — Rewards catalog, redemption flow, admin queue, emails
- [ ] **M4** — Streaks, birthday, referral, expiry warnings, audit log
- [ ] **M5** — PWA, push notifications, analytics, load test

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
