# preview deploy — click copula on your phone in ~15 minutes

This is the fastest path to a live URL you can test with your thumbs. It
leaves Patreon / Stripe / real fans out of the picture — you'll be signing
in as one of the five seeded demo fans (hana, mars, etc) exactly like the
local demo, just hosted on Vercel so you can open it on any device.

When you're ready to add real Patreon sign-in, do `docs/publish-runbook.md`
on top of this.

---

## what you need

- A Mac (or Linux) with Node 20+ installed.
- A Neon Postgres project (free tier): [neon.tech](https://neon.tech) →
  sign up → new project named `copula` → **Dashboard → Connection Details
  → Pooled connection** → copy the `postgresql://…` URL.
- A Vercel account (free): [vercel.com](https://vercel.com).
- This repo cloned locally, on branch `claude/ebril-rewards-app-lpqY5`.

## one command

From the repo root:

```bash
./scripts/preview-deploy.sh
```

The script walks you through:

1. Installing the Vercel CLI if needed.
2. `vercel login` — opens a browser, sign in, come back.
3. `vercel link` — create a new Vercel project named `copula` (or link
   to an existing one).
4. Asks you for the Neon `DATABASE_URL` you copied.
5. Generates real production secrets on your machine (ENCRYPTION_KEY,
   SESSION_SECRET, CRON_SECRET, VAPID_*) and writes them to Vercel.
6. Enables `DEMO_MODE=1` so you can sign in as a seeded fan without
   setting up Patreon OAuth.
7. Pushes the Prisma schema + runs both seeds against your Neon DB.
8. Deploys a Vercel preview and prints the URL.

Total hands-on time: ~5 minutes of your attention across 15 minutes of
wall-clock time (most of it is Vercel building).

## after it finishes

The script prints something like:

```
Done. Open this on your phone:

  https://copula-abc123.vercel.app/demo
```

- Open that URL anywhere. Tap a fan card. You're in.
- The yellow "DEMO MODE" bar across the top is there on purpose — it's the
  reminder that the auth bypass is live.
- Sign in as **hana** for the fullest view, **mars** for admin.
- Edit `/admin/moments`, `/admin/songs`, `/admin/rituals` etc and watch
  your changes show up live. This is how you'll test content before going
  public.

## important — before you share the URL

Demo mode lets **anyone who finds the URL** sign in as one of the five
seeded fans. That's fine when it's just you. Before posting the link
anywhere, turn demo mode off:

```bash
vercel env rm DEMO_MODE preview --yes
vercel --yes
```

That removes the `DEMO_MODE` env var and triggers a redeploy. The
`/api/demo/sign-in` route now returns 404 for everyone. At that point
the app expects Patreon OAuth — you'll need to add the Patreon env vars
from `docs/publish-runbook.md` section 2 before anyone can actually sign
in.

## troubleshooting

- **`vercel login` hangs:** open the browser URL it prints, authenticate,
  come back to the terminal. If that doesn't work, try `vercel logout &&
  vercel login`.
- **Build fails with a Prisma error:** make sure `DATABASE_URL` is
  reachable from the internet (Neon's pooled URL always is; a self-
  hosted Postgres might not be).
- **"Permission denied" on `./scripts/preview-deploy.sh`:** `chmod +x
  scripts/preview-deploy.sh`.
- **You want to change a seed / add content:** edit what you want, then
  `DATABASE_URL=... npx tsx prisma/seed-demo.ts` — re-runs are idempotent.

## tear it down

When you're done testing and want to remove the project completely:

```bash
vercel rm copula --yes
```

Deletes the Vercel project and takes the URL down. Your Neon project is
separate — delete it at neon.tech if you want the DB gone too.
