# Ebril Rewards — MVP Spec

A Patreon-connected loyalty app modeled on the Dick's Sporting Goods ScoreCard engagement loops: effortless accrual, visible tiered progress, personalized time-bound perks, redeemable rewards.

---

## 1. Product goals

1. Convert existing Patreon pledges into a gamified points balance without any manual action from the fan.
2. Give fans a clear, visible ladder (tier + progress bar + streak) so engagement compounds month over month.
3. Let Ebril run time-bound campaigns (double points, birthday bonus, early access drops) from an admin panel.
4. Provide a redemption flow fans actually want: merch discounts, signed items, 1:1s, exclusive content vault.

Non-goals (MVP): native mobile app, in-app payments (Patreon stays the payment rail), gift cards, multi-creator support.

---

## 2. User roles

- **Fan** — logs in with Patreon OAuth, sees balance/tier/perks, redeems rewards.
- **Ebril (admin)** — single admin account; configures tiers, rules, campaigns, approves redemptions, ships fulfillment.

---

## 3. Core loops (mapped from ScoreCard)

| ScoreCard mechanic | Ebril equivalent |
| --- | --- |
| Auto-linked points at checkout | Patreon webhook → points credited on pledge charge |
| Gold / Platinum tier thresholds | Fan → Superfan → VIP (configurable $/month or lifetime $) |
| Bonus-point weekends | Admin-scheduled multiplier campaigns |
| Birthday offer | DOB captured at signup → bonus points + perk on birthday week |
| Member-only drops | Tier-gated content vault + early access links |
| Expiring rewards push | Email/push when points expire or campaign ends |
| Barcode always one tap away | Home screen = balance + tier progress + active perks |

---

## 4. Data model (Postgres)

```
users
  id (uuid pk)
  patreon_user_id (text unique)
  email (text)
  display_name (text)
  avatar_url (text)
  dob (date, nullable)
  created_at, updated_at

pledges                        -- mirror of Patreon state
  id (uuid pk)
  user_id (fk users)
  patreon_pledge_id (text unique)
  amount_cents (int)
  currency (text)
  status (active|paused|declined|cancelled)
  started_at, last_charged_at

point_transactions             -- append-only ledger
  id (uuid pk)
  user_id (fk users)
  delta (int, +/-)
  reason (enum: pledge_charge, campaign_bonus, birthday, referral,
                streak, manual_adjust, redemption, expiry)
  ref_id (text, nullable)      -- pledge charge id / campaign id / redemption id
  expires_at (timestamp, nullable)
  created_at

tiers
  id (uuid pk)
  name (text)                  -- Fan / Superfan / VIP
  sort_order (int)
  threshold_cents_per_month (int)   -- qualifying rule
  perks (jsonb)                -- list of {label, type, value}

campaigns
  id (uuid pk)
  name (text)
  multiplier (numeric)         -- e.g. 2.0 for double points
  flat_bonus (int, nullable)
  starts_at, ends_at
  tier_filter (jsonb, nullable)

rewards                        -- the catalog
  id (uuid pk)
  name (text)
  description (text)
  image_url (text)
  cost_points (int)
  stock (int, nullable)        -- null = unlimited (digital)
  tier_required (fk tiers, nullable)
  type (enum: merch, signed, call_1on1, content_unlock, discount_code)
  active (bool)

redemptions
  id (uuid pk)
  user_id (fk users)
  reward_id (fk rewards)
  cost_points (int)            -- frozen at time of redemption
  status (enum: pending, approved, shipped, delivered, cancelled)
  shipping_address (jsonb, nullable)
  fulfillment_notes (text)
  created_at, updated_at
```

Rationale for an append-only `point_transactions` ledger: balance is always `SUM(delta)` — no sync bugs, full audit trail, easy to reverse a bad campaign.

---

## 5. Points rules (v1 defaults, admin-editable)

- **$1 pledged = 10 points** (credited when Patreon fires `members:pledge:charge` successfully).
- **Streak bonus**: +100 points at month 3, +250 at month 6, +500 at month 12 consecutive months pledged.
- **Birthday**: 500 points auto-credited on DOB; one-time perk code for a tier-appropriate reward.
- **Referral**: 500 points to referrer once referred fan's first pledge charges successfully.
- **Expiry**: points expire 18 months after earn date (ledger row carries `expires_at`).

---

## 6. Tiers (v1 defaults)

| Tier | Qualify | Perks |
| --- | --- | --- |
| Fan | any active pledge | Community Discord, points earning |
| Superfan | ≥ $15/mo for 2 consecutive months | 1.25× points multiplier, early access to drops, monthly voice note |
| VIP | ≥ $50/mo for 2 consecutive months | 1.5× multiplier, quarterly 1:1, signed merch eligibility, name in credits |

Downgrade after 2 consecutive months below threshold; show a "grace period" warning at month 1.

---

## 7. Patreon integration

**OAuth scopes**: `identity`, `identity[email]`, `campaigns.members`.

**Auth flow**:
1. Fan clicks "Connect Patreon" → OAuth redirect.
2. Callback stores `patreon_user_id`, access + refresh tokens (encrypted at rest).
3. Job pulls current pledge state and backfills a single `pledge_charge` point transaction for the *current* month only (no retroactive farming).

**Webhooks** (subscribe at campaign level):
- `members:pledge:create` → upsert pledge, insert welcome bonus.
- `members:pledge:update` → update pledge row.
- `members:pledge:delete` → mark cancelled, freeze tier at next boundary.
- `members:update` → payment status changes (handles declined → stop points).

**Signature verification**: validate `X-Patreon-Signature` HMAC before writing.

**Reconciliation job**: nightly cron pulls full member list via API, diffs against local `pledges` to catch missed webhooks.

---

## 8. Redemption pipeline

```
Fan clicks Redeem
  → confirm modal with cost + shipping form if physical
  → POST /api/redemptions
      - re-check balance (row lock on user)
      - write point_transactions row (delta = -cost)
      - write redemptions row (status=pending)
  → admin queue in dashboard
      - approve / cancel
      - mark shipped + tracking number
      - on cancel: reverse ledger entry
  → fan sees status updates + email
```

Digital rewards (content unlock, discount code) auto-fulfill on redemption — no admin approval needed.

---

## 9. Admin surfaces

- **Dashboard**: MAU, points in circulation, points redeemed, active campaigns, redemption queue depth.
- **Campaigns**: CRUD for multiplier/bonus windows with tier filters.
- **Rewards catalog**: CRUD, stock management, toggle active.
- **Redemption queue**: filter by status, bulk mark shipped, export CSV for shipping.
- **Fan lookup**: search by email/handle → see ledger, tier, pledge status, manual point adjust with required reason.
- **Audit log**: every admin write action logged.

---

## 10. Fan surfaces

- **Home**: avatar, tier badge, points balance (animated counter), progress bar to next tier, active perks card, current campaign banner.
- **Earn**: explains rules, shows streak, referral link with copy button.
- **Rewards**: catalog filtered by "affordable now" / "unlockable at next tier".
- **Redemptions**: history with status.
- **Profile**: DOB, shipping address, notification preferences, disconnect Patreon.

---

## 11. Tech stack

- **Framework**: Next.js (already scaffolded) with App Router + TypeScript.
- **DB**: Postgres via Prisma.
- **Auth**: Patreon OAuth (server-side), session in httpOnly cookie, JWT for admin.
- **Jobs**: one cron endpoint hit by Vercel Cron for reconciliation, streaks, expiry, birthday credits.
- **Email**: Resend or Postmark for transactional (redemption status, expiry warning, birthday).
- **Push (later)**: Web Push via VAPID once PWA is live.
- **Hosting**: Vercel (web) + Neon/Supabase (Postgres).
- **Secrets**: Patreon client id/secret, webhook secret, session secret, DB url — all in env.

---

## 12. Security & compliance

- Encrypt Patreon refresh tokens at rest (libsodium secretbox, key in env).
- All webhook endpoints verify HMAC before DB writes.
- Rate-limit redemption endpoint (1/sec/user) to prevent double-spend races; rely on DB row lock as source of truth.
- Admin actions require re-auth for destructive ops (bulk point adjustments, reward deletion).
- PII (shipping address, DOB) scoped to admin role only; never in client bundles.
- Clear ToS on point expiry, tier downgrades, redemption cancellation.

---

## 13. Milestones

- **M1 — Auth + mirror (week 1)** ✅: Patreon OAuth, pledge mirror, ledger schema, home screen showing balance from ledger.
- **M2 — Tiers + campaigns (week 2)**: tier evaluation cron, admin campaign CRUD, multiplier applied on charge.
- **M3 — Rewards + redemption (week 3)**: catalog, redemption flow, admin queue, email notifications.
- **M4 — Engagement (week 4)**: streaks, birthday, referral, expiry warnings, audit log.
- **M5 — Polish**: PWA manifest, push notifications, analytics events, load test the redemption path.

---

## 14. Open questions for Ebril

1. Starting tier thresholds — do the $15 / $50 numbers match the actual Patreon tier pricing?
2. Which rewards are realistic to fulfill at launch? (Digital-only MVP is the fastest path.)
3. Points-to-dollar conversion rate for perception — is 10 pts = $1 pledged the right feel, or should it be larger (100 pts = $1) for bigger numbers?
4. Do cancelled pledges zero the balance, freeze it, or keep it spendable? (Recommendation: keep spendable; it's an unpaid liability but great reactivation hook.)
5. Is the admin surface web-only acceptable for v1, or does Ebril need a mobile-first admin view for on-the-go approvals?
