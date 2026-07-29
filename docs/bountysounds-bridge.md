# copula ↔ bountysounds — the clip→bounty bridge

The first concrete slice of the copula/bountysounds merge: turn a copula
**direction** into a funded **bountysounds contract**, let copula's fans
claim it, gate payout behind copula's human moderation, and pay per
verified view.

This is written from the copula side (Next.js + Prisma + Postgres).
bountysounds is Vite + React + Supabase. They do **not** share a
database — they bridge over signed HTTP, the same pattern copula already
uses for the Minecraft server (`docs/minecraft-integration.md`). That
keeps each app's stack intact and lets us ship the pipe without a
multi-tenant schema rewrite first.

---

## why a bridge, not a merge (yet)

Two separate stacks, two separate DBs. Collapsing them into one is the
eventual multi-tenant story, but the *value* — Ebril's fans becoming
paid clippers — needs only a thin contract between the two apps:

- **copula owns**: the brief (direction, sound, caption, moodboard), the
  clipper identity (a real signed-in fan with a tier + history), and the
  human moderation gate (`kept · held · carried`).
- **bountysounds owns**: the pot (escrow), the $/view rate, the deadline,
  **view verification**, and the actual payout.

Neither side gives up its source of truth. The bridge just keeps two
rows in sync across the wire.

---

## the object mapping

| copula (Prisma) | bountysounds (Supabase) | who's source of truth |
|---|---|---|
| `ClippingBrief` (a direction) | `bounties` (a contract) | copula for creative fields; bountysounds for pot/rate/deadline |
| `Clip` (a fan submission) | a claim + submission on the contract | copula for the URL + moderation status; bountysounds for verified views + payout |
| `Clip.viewCount` | bountysounds' verified view count | **bountysounds** — copula's field becomes a mirror, not a source |
| `User` (a fan) | a bountysounds clipper account | copula identity is primary; bountysounds links to `copulaUserId` |
| `PointTransaction` (reason `clip_approved`) | `bounty_payments` (cash) | separate rails — points ≠ cash, both can fire |

The important reframing: **copula's `Clip.viewCount` stops being
self-reported and starts being fed from bountysounds' verified count.**
That single change is what makes the "viral" tier trustworthy and closes
the biggest fraud hole.

---

## the flow, end to end

```
1. Ebril writes a direction in copula admin  (ClippingBrief)
2. She marks it "fund on bountysounds" + sets pot $ + rate + deadline
        │
        ├─► copula POSTs  bounties/publish → bountysounds
        │      creates a contract, returns { contractId }
        │      copula stores contractId on the brief
        ▼
3. A fan opens the direction in copula, makes a TikTok, submits the URL
        │   (existing copula clip flow — unchanged for the fan)
        ├─► copula POSTs  claims/submit → bountysounds
        │      { contractId, copulaUserId, clipUrl, tiktokHandle }
        ▼
4. copula admin moderates the clip:  kept / held / carried  (or returns)
        │   THIS IS THE ANTI-FRAUD GATE — a human confirms the clip is
        │   real, on-brief, and uses the sound, BEFORE any money moves.
        ├─► on "kept" (approved): copula POSTs  claims/approve → bountysounds
        │      marks the claim payout-eligible
        ▼
5. bountysounds polls TikTok for verified views on eligible claims
        │   (bountysounds owns this — its existing "verified views" engine)
        ├─► on each verified-view checkpoint, bountysounds POSTs
        │      views/report → copula   { clipId, verifiedViews, paidCents }
        │      copula updates Clip.viewCount + shows cash earned
        │      copula auto-promotes tier (approved→featured→viral) off
        │      the *verified* number, and awards points as it already does
        ▼
6. Payout: bountysounds pays the clipper from the pot (Stripe Connect),
        writes bounty_payments, and reports paidCents back to copula so
        the fan sees "$X earned · N pts" in one place.
```

The fan's copula experience doesn't change — they still just post a clip
against a direction. What changes is that behind the glass, an approved
clip now also earns **cash from a real pot**, and the view count they see
is the **verified** one.

---

## the wire contract (HTTP + HMAC)

Mirror `docs/minecraft-integration.md` exactly: one shared secret, every
request signed.

```
X-Bountysounds-Signature: <hex HMAC-SHA256(rawBody, BOUNTYSOUNDS_SHARED_SECRET)>
```

New env on the copula side:

```
BOUNTYSOUNDS_BASE_URL=https://bountysounds.com
BOUNTYSOUNDS_SHARED_SECRET=<openssl rand -hex 32>   # same value both sides
```

### copula → bountysounds

**`POST {BOUNTYSOUNDS_BASE_URL}/api/bridge/contracts`** — publish a brief.
```json
{
  "copulaBriefId": "…uuid…",
  "artistSlug": "ebril",
  "title": "Anticipate Heartbreak — cinematic edit",
  "direction": "trailer-style sequences, emotional film montages…",
  "soundUrl": "https://www.tiktok.com/music/…",
  "captionTemplate": "…",
  "coverUrl": "https://…",
  "potCents": 50000,
  "ratePer100kCents": 200,
  "deadline": "2026-06-30T00:00:00Z"
}
→ 200 { "contractId": "…", "boardUrl": "https://bountysounds.com/c/002" }
```

**`POST /api/bridge/claims`** — a fan submitted a clip in copula.
```json
{
  "contractId": "…",
  "copulaUserId": "…uuid…",
  "copulaClipId": "…uuid…",
  "clipUrl": "https://www.tiktok.com/@fan/video/…",
  "tiktokHandle": "@fan"
}
→ 200 { "claimId": "…" }
```

**`POST /api/bridge/claims/{claimId}/approve`** — copula moderation passed.
Body signs `{ copulaClipId, decision: "approved" }`. This is the gate that
flips a claim from "submitted" to "payout-eligible" on the bounty side.

### bountysounds → copula (new routes to build here)

**`POST /api/bountysounds/views`** — verified-view checkpoint + payout.
Signed with the same secret; copula verifies, then updates the clip.
```json
{
  "copulaClipId": "…uuid…",
  "verifiedViews": 340000,
  "paidCents": 680,
  "idempotencyKey": "payout:claim123:2026-06-15"
}
```
copula: set `Clip.viewCount` = verifiedViews, stamp `viewCountUpdatedAt`,
auto-promote status off the verified number (see `viralThreshold` on the
brief), and record cash-earned for display. Idempotent on
`idempotencyKey` exactly like the Minecraft `grant` endpoint.

---

## what changes on the copula side

Small, additive. No breaking changes to the fan flow.

1. **Schema** — add to `ClippingBrief`:
   ```prisma
   bountysoundsContractId String?   // set once published
   potCents               Int?      // mirror for display
   ratePer100kCents       Int?
   ```
   and to `Clip`:
   ```prisma
   bountysoundsClaimId String?
   cashEarnedCents     Int     @default(0)   // fed from bountysounds
   ```
   `Clip.viewCount` already exists — we just stop trusting fan-reported
   values for funded briefs and let the bridge own it.

2. **Admin** — on the direction editor, a "fund on bountysounds" panel:
   pot $, rate, deadline → calls `contracts` publish, stores the id, shows
   the board URL. (Reuse the season-pass admin form patterns.)

3. **Clip moderation** — `moveClipStatus` already fires on approve. Add a
   hook: when a clip on a funded brief moves to `approved`, POST the
   `claims/{id}/approve` call (best-effort, never blocks the DB txn — same
   pattern as `syncTierRoleSafe`).

4. **New inbound route** — `/api/bountysounds/views` per above.

5. **Fan display** — clip cards and `/my-clips` show `$X earned` next to
   the points when `cashEarnedCents > 0`.

---

## money + verification (the parts that must be right)

- **Human gate before cash.** copula's moderation is the fraud filter:
  no claim becomes payout-eligible until a human confirms the clip is
  real, on-brief, and actually uses the sound. This is copula's biggest
  contribution to bountysounds' integrity problem.
- **Verified views own the number.** copula never pays (it deals in
  points); bountysounds pays from the verified count it controls. The
  bridge only *reports* that number back so copula can display it and
  award its own points/tiers.
- **Idempotency everywhere.** `views` reports carry an `idempotencyKey`;
  copula dedupes exactly like `mc:<key>`. A re-sent payout report is a
  no-op, never a double-credit.
- **Payout rail is Stripe Connect on the bountysounds side** — clippers
  are contractors (1099 thresholds, TikTok ToS on paid engagement). Out
  of scope for copula; flagged for legal before real volume.

---

## security findings to fold in (from Lovable's scan — verify in the bountysounds repo)

These live on the bountysounds/Supabase side. Verify against actual
migrations before the first funded pot goes live:

1. **`bounties` RLS over-exposure.** Policy "bounties readable to
   authenticated" exposes every column to any signed-in user, including
   `stripe_customer_id`, `top_up_session_id`, `funded_cash_cents`. Fix:
   a restricted public view (omit those three columns) for `authenticated`,
   full-row SELECT only for `auth.uid() = created_by OR is_staff(...)`.
   **Do this before real money is in a pot** — those columns are exactly
   what an attacker wants.
2. **`bounty_payments` INSERT policy.** Only staff can INSERT today.
   Confirm payment rows are written **server-side only** (Stripe webhook
   or a Supabase edge function using the `service_role` key, which
   bypasses RLS). If so, the policy is correct — leave it and add a
   comment saying why. If a creator's browser ever inserts directly, add:
   `with check (exists (select 1 from bounties b where b.id = bounty_id
   and b.created_by = auth.uid()))`.
3. **`@tanstack/react-start@1.168.26`** — 1 high + 1 medium advisory.
   `npm audit --json` for the CVE ids, upgrade to the highest patched 1.x
   (avoid the 2.x jump unless the fix isn't backported).

---

## phase 1 — the minimal slice (don't multi-tenant yet)

Prove the pipe with one direction before generalizing:

1. Stand up the shared secret both sides.
2. bountysounds: build the 3 inbound routes (`contracts`, `claims`,
   `claims/approve`) + fix RLS finding #1.
3. copula: add the schema fields, the "fund on bountysounds" admin panel,
   the moderation→approve hook, and the `/api/bountysounds/views` inbound
   route.
4. Publish **one** real, funded contract for Ebril's "Anticipate
   Heartbreak" (it's already contract #002 on the live board — wire it,
   fund the pot, set a deadline).
5. Run one fan clip all the way through: submit → moderate → verified
   views → payout → cash shown in copula.

Screenshot that first payout. That's the proof that unlocks artist #2 —
and the point at which the multi-tenant schema work is worth doing.
