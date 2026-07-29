#!/usr/bin/env bash
# Deploy a personal-testing preview of copula to Vercel in ~15 minutes.
# This is the fastest path between "I own everything" and "I have a URL I
# can open on my phone". Optimized for DEMO_MODE (no Patreon OAuth
# required) so you can click through before any external services are set
# up.
#
# What this script does:
#   1. Makes sure the Vercel CLI is installed and you're logged in
#   2. Links this repo to a new (or existing) Vercel project
#   3. Asks you for a Postgres connection string (from neon.tech)
#   4. Generates fresh production secrets
#   5. Writes all env vars to the Vercel preview environment
#   6. Pushes the schema + runs seeds against your prod DB
#   7. Deploys a preview build
#
# What you need before running:
#   - Node 20+
#   - A Neon Postgres DATABASE_URL (https://neon.tech → create project)
#   - A Vercel account (free)

set -euo pipefail

cd "$(dirname "$0")/.."

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "· %s\n" "$*"; }
warn() { printf "\033[33m! %s\033[0m\n" "$*"; }
die()  { printf "\033[31m× %s\033[0m\n" "$*"; exit 1; }

bold "copula · preview deploy"
echo

# --- 1 · vercel CLI ---
if ! command -v vercel >/dev/null 2>&1; then
  info "Installing vercel CLI (global)…"
  npm i -g vercel >/dev/null
fi
info "Vercel CLI: $(vercel --version)"

# --- 2 · login + link ---
if ! vercel whoami >/dev/null 2>&1; then
  bold "Logging into Vercel…"
  vercel login
fi
info "Signed in as: $(vercel whoami)"

if [ ! -d .vercel ]; then
  bold "Linking this repo to a Vercel project…"
  vercel link
fi

# --- 3 · DB ---
if [ -z "${DATABASE_URL:-}" ]; then
  echo
  bold "Paste your Neon DATABASE_URL"
  echo "  (find it at neon.tech → your project → Dashboard → Connection Details → Pooled connection)"
  read -rp "DATABASE_URL> " DATABASE_URL
fi
[ -n "$DATABASE_URL" ] || die "DATABASE_URL is required."
export DATABASE_URL

# --- 4 · fresh secrets ---
bold "Generating production secrets…"
SESSION_SECRET=$(openssl rand -hex 48)
ENCRYPTION_KEY=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -hex 32)
VAPID=$(npx --yes web-push generate-vapid-keys 2>/dev/null | tr -d '\n')
VAPID_PUBLIC_KEY=$(printf '%s' "$VAPID" | sed -n 's/.*Public Key: *\([A-Za-z0-9_-]*\).*/\1/p')
VAPID_PRIVATE_KEY=$(printf '%s' "$VAPID" | sed -n 's/.*Private Key: *\([A-Za-z0-9_-]*\).*/\1/p')

# --- 5 · env vars to Vercel ---
echo
bold "Writing env vars to Vercel (preview env only)…"
set_env() {
  local key="$1"
  local value="$2"
  # remove existing first so we can re-run cleanly
  vercel env rm "$key" preview --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$key" preview >/dev/null
  info "  $key"
}

set_env DATABASE_URL        "$DATABASE_URL"
set_env SESSION_SECRET      "$SESSION_SECRET"
set_env ENCRYPTION_KEY      "$ENCRYPTION_KEY"
set_env CRON_SECRET         "$CRON_SECRET"
set_env VAPID_PUBLIC_KEY    "$VAPID_PUBLIC_KEY"
set_env VAPID_PRIVATE_KEY   "$VAPID_PRIVATE_KEY"
set_env VAPID_SUBJECT       "mailto:hello@ebril.com"
set_env DEMO_MODE           "1"
set_env ADMIN_PATREON_IDS   "demo-mars"
# APP_BASE_URL is set after the first deploy lands us a url; we'll
# write a placeholder and update it after.
set_env APP_BASE_URL        "https://placeholder.vercel.app"

# --- 6 · db setup ---
echo
bold "Pushing schema + seeds to your Neon DB…"
npx prisma db push
npx tsx prisma/seed.ts
npx tsx prisma/seed-demo.ts

# --- 7 · deploy ---
echo
bold "Triggering preview deploy…"
DEPLOY_URL=$(vercel --yes 2>&1 | tee /tmp/vercel-deploy.log | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1 || true)
if [ -z "$DEPLOY_URL" ]; then
  warn "Couldn't auto-detect the deployment URL. Scroll up to find the 'Preview:' line."
else
  bold "Deployed: $DEPLOY_URL"
  info "Updating APP_BASE_URL to match…"
  set_env APP_BASE_URL "$DEPLOY_URL"
  bold "Re-deploying so server-side code picks up the corrected APP_BASE_URL…"
  vercel --yes >/dev/null
  echo
  bold "Done. Open this on your phone:"
  echo
  echo "  $DEPLOY_URL/demo"
  echo
  info "Sign in as 'hana' for the fullest view, or 'mars' for admin."
fi

echo
warn "Important: DEMO_MODE=1 means ANYONE who finds this URL can sign in"
warn "as one of the five fake fans. Fine for your personal testing."
warn "Before sharing this URL widely, or before connecting real Patreon"
warn "accounts, flip DEMO_MODE off:"
echo
echo "  vercel env rm DEMO_MODE preview --yes"
echo "  vercel --yes"
echo
