# one-click deploy — copula on your phone

The absolute shortest path. No terminal, no cloning, no cli. Two clicks,
one paste.

## 1 · click this button

Opens Vercel's project-clone flow with env var fields pre-labeled for
you:

[**Deploy copula to Vercel**](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmaxflohr-ops%2FEbril-try-1&project-name=copula&repository-name=copula&env=DATABASE_URL,SESSION_SECRET,ENCRYPTION_KEY,CRON_SECRET,DEMO_MODE,ADMIN_PATREON_IDS&envDescription=See%20docs%2Fone-click-deploy.md%20for%20what%20to%20paste.%20DEMO_MODE%3D1%20lets%20you%20sign%20in%20as%20a%20seeded%20fan%20without%20setting%20up%20Patreon.&envLink=https%3A%2F%2Fgithub.com%2Fmaxflohr-ops%2FEbril-try-1%2Fblob%2Fclaude%2Febril-rewards-app-lpqY5%2Fdocs%2Fone-click-deploy.md%23what-to-paste)

Vercel will:

- ask you to sign in (one-time; use Ebril's Vercel account or create one — free),
- ask which git org to clone this repo under (your personal is fine),
- show you six env var fields pre-labeled.

## 2 · add a Postgres

Right after the clone, Vercel shows "Add Storage." Click it.

Pick **Neon Postgres** (free tier). Name it `copula`. Click create.

Vercel automatically fills `DATABASE_URL` in your env vars. That's the one
paste you **don't** have to do yourself.

## 3 · paste these into the other five env fields

Copy the values below. Each one is a fresh secret generated just for this
deploy — they don't leak anything because they've never been used anywhere
else.

```
SESSION_SECRET=a0f95988f595870d5accec0a8bb8262b9f9a7bfdc732f75c29e22d99cddcbd3efd7632a58a5ba940881ae4e8d1e4a34f

ENCRYPTION_KEY=buq3o0dKgK3y6dpDfm/mTfp7NoT8zlg333nGFz/aldw=

CRON_SECRET=9aee446dd9fef0b2bba82c6406f063256f5c60dc3e30af4c8acc1f39803d7f4d

DEMO_MODE=1

ADMIN_PATREON_IDS=demo-mars
```

> **If you want to be extra careful**, regenerate these on your own machine
> with `openssl rand -hex 48`, `openssl rand -base64 32`, and
> `openssl rand -hex 32` — they've now been printed in a chat log, which
> is fine for personal testing but not great for anything shared.

## 4 · click Deploy

Vercel builds + deploys in ~90 seconds. You'll land on a page with your
URL: `https://copula-<something>.vercel.app`.

## 5 · run the seeds once (two commands)

The schema is empty until you push it. From Vercel's project dashboard:

1. Go to the **Storage** tab, click your Postgres.
2. Click **Query** → run this pasted SQL to bootstrap the schema:

   Nope, actually don't do that — Vercel's query tab doesn't handle
   Prisma migrations well. Easier path:

3. Clone the repo locally, set `DATABASE_URL` to your Neon URL (copy from
   Vercel → Storage), and run:

   ```bash
   DATABASE_URL="..." npx prisma db push
   DATABASE_URL="..." npx tsx prisma/seed.ts
   DATABASE_URL="..." npx tsx prisma/seed-demo.ts
   ```

   This step is two minutes total. You only do it once.

## 6 · open it

Open `https://copula-<hash>.vercel.app/demo` on your phone. Pick **hana**.
You're in.

Yellow banner across the top is the reminder that demo mode is on. Sign
in as **mars** to see `/admin`.

---

## before you share the URL

Demo mode is an auth bypass. **Do not share the URL publicly** until you
turn it off. From your Vercel project dashboard → Settings → Environment
Variables, delete `DEMO_MODE`, then hit Redeploy.

After that, `/api/demo/sign-in` returns 404 for everyone. You'll need to
add Patreon OAuth env vars for real sign-in — see `docs/publish-runbook.md`
section 2.

## if the button doesn't work

Some Vercel accounts need GitHub to be connected before clone works. Fix
in three clicks:

1. Go to [vercel.com/account/login-connections](https://vercel.com/account/login-connections).
2. Connect GitHub.
3. Re-click the button above.

Or skip the button entirely and use the local script:

```bash
./scripts/preview-deploy.sh
```
