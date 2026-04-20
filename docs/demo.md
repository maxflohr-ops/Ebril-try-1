# copula demo — five-minute walkthrough

A runnable demo that doesn't need Patreon OAuth, Stripe keys, push keys,
email keys, or any other external service. You get a live Postgres, a
seeded app, and five fake fans to sign in as with one click.

## 0. What you need

- Node 20+
- A Postgres connection string (local `brew services start postgresql`, a
  Neon free-tier DB, Docker — whatever works).
- About five minutes.

## 1. Set up

```bash
cp .env.example .env
```

Then edit `.env` and set three lines:

```
DATABASE_URL=postgresql://…     # your local / hosted postgres
APP_BASE_URL=http://localhost:3000
SESSION_SECRET=demo-session-secret-change-me-at-least-32-characters-long
DEMO_MODE=1
ADMIN_PATREON_IDS=demo-mars
```

Every other key (Patreon, Stripe, push, email, Sentry, encryption) can
stay blank — the corresponding subsystem no-ops in dev.

## 2. Bring it up

```bash
npm install
npx prisma db push              # applies the schema
npx tsx prisma/seed.ts          # base catalog
npx tsx prisma/seed-demo.ts     # five demo fans with lived-in histories
npm run dev
```

Open <http://localhost:3000/demo>. You'll see five fan cards.

## 3. The walkthrough (≈ 3 minutes)

**Sign in as hana (superfan, diarist, gifter, showgoer).**

1. **Home**: live post from Ebril pinned at the top, big balance card,
   tier card with the heartbeat dot, tonight's ritual live, the direction
   hero from the current era below that. Scroll the nav row: songs, eras,
   your clips, the wall, who's carrying, moments, dusk diary, voice notes,
   shows, collection, rewards, redemptions, buy points, gift, your week,
   profile.
2. **`/wrapped`**: the last 7 days as a tinted recap. Note the dominant-
   mood accent.
3. **`/eras`** → click **In Copula** → pick **dusk window**: moodboard
   strip, "use this sound on tiktok" button, copy-paste caption,
   reward ladder (kept / held / carried). Scroll to the bottom to see
   hana's own takes against this direction.
4. **`/wall`**: everyone's featured + viral clips grouped by era.
5. **`/leaderboard`**: hana is near the top; mars and noor have clips
   too.
6. **`/collection`**: her earned cassettes + the ones still to find.
7. **`/gift`**: hana has received 2 gifts recently (from mars and noor)
   and sent 1 (to rhea). Try sending 100 pts to another demo fan's
   referral code (copy it from that fan's profile).

**Switch fans via the yellow bar at the top → "switch" → pick mars.**

8. Mars is the admin (`ADMIN_PATREON_IDS=demo-mars`). Go to `/admin` —
   dashboard tiles, moderation queue, moments composer, campaigns,
   rewards, point packs, rituals, directions with per-direction
   moodboard editor, tour + QR rotator, redemption queue, links,
   shared diary, audit log.

**Sign in as lyrie (fan, diarist).**

9. Minimal activity to show the empty-ish state without looking barren.
   Check `/diary` for her streak.

## 4. What gets no-oped in demo

Because most external services are blank, these features degrade
gracefully without errors:

- Patreon sync: no real tokens, so `/api/cron/patreon-reconcile` skips
  every user with `status: skipped`.
- Stripe: `/points/buy` clicks return "couldn't open checkout."
  `/shop` shows "the shop is setting up" when `SHOPIFY_STORE_DOMAIN`
  isn't configured.
- Email + push: send calls log to console.
- Sentry: initialized only when DSN is set; no-op otherwise.

## 5. Resetting

```bash
npx prisma db push --force-reset   # nukes the DB
npx tsx prisma/seed.ts
npx tsx prisma/seed-demo.ts
```

The demo seed is also idempotent — re-running it won't duplicate data.

## 6. Showing it off

If you're demoing to someone over Zoom, these are the three screens that
land hardest:

1. **Home** of hana — it's the densest "something is happening here"
   view.
2. **`/clip/<dusk-window-id>`** — it's the clearest "the app tells fans
   what to make."
3. **`/wrapped`** — it's the moment the recap voice hits.

## 7. Production sanity check

Before you deploy, verify `DEMO_MODE` is **unset** in your prod env. The
demo sign-in endpoint fails closed (`404`) when `DEMO_MODE !== "1"`, and
the banner doesn't render — but it's worth a grep.

```bash
grep -R DEMO_MODE .env*   # should only show .env.example and your local .env
```
