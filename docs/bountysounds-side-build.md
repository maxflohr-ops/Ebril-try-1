# bountysounds side — what to add for the copula bridge

Everything to build on the bountysounds (Vite + Supabase) side so the
copula↔bountysounds bridge in `bountysounds-bridge.md` works. All of this
is server-side (Supabase Edge Functions + SQL migrations) because it
needs the `service_role` key and HMAC verification — none of it is client
React code.

Paste-ready Lovable prompt is at the bottom.

---

## 1. secret (both sides share one value)

Supabase → Project Settings → Edge Functions → Secrets:

```
BRIDGE_SHARED_SECRET = <openssl rand -hex 32>   # identical to copula's BOUNTYSOUNDS_SHARED_SECRET
COPULA_BASE_URL      = https://copula.ebril.com  (or the current copula URL)
```

Every bridge request is signed:
`X-Bountysounds-Signature: hex HMAC-SHA256(rawBody, BRIDGE_SHARED_SECRET)`
Verify with `crypto.timingSafeEqual` — reject anything not 64 lowercase
hex chars before comparing.

---

## 2. columns to add (SQL migration)

On `bounties` (link a contract back to its copula brief):
```sql
alter table bounties
  add column copula_brief_id text unique,   -- set when copula publishes it
  add column artist_slug     text;          -- 'ebril' — the future tenant key
```

New table `bounty_claims` (a fan's clip claim on a contract) — if you
don't already have one:
```sql
create table bounty_claims (
  id              uuid primary key default gen_random_uuid(),
  bounty_id       uuid not null references bounties(id) on delete cascade,
  copula_user_id  text not null,            -- who, on the copula side
  copula_clip_id  text not null unique,     -- the copula Clip.id (idempotency anchor)
  clip_url        text not null,
  tiktok_handle   text,
  status          text not null default 'submitted',
      -- submitted → approved (copula moderation passed) → paying → paid → rejected
  verified_views  bigint not null default 0,
  paid_cents      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on bounty_claims (bounty_id, status);
create index on bounty_claims (copula_user_id);
```

`bounty_payments` — keep as is (staff/service-role INSERT only). See §5.

---

## 3. RLS fixes (do these before any real money in a pot)

### finding #1 — bounties over-exposes sensitive columns
The current "readable to authenticated" policy hands `stripe_customer_id`,
`top_up_session_id`, `funded_cash_cents` to every signed-in user. Fix with
a public view + owner/staff-only full row:

```sql
-- public view: everything the board needs, none of the money plumbing
create view bounties_public as
  select id, title, description, sound_url, cover_url, artist_slug,
         rate_per_100k_cents, deadline, status, created_at
  from bounties;
grant select on bounties_public to authenticated, anon;

-- lock the base table: full row only for owner or staff
drop policy if exists "bounties readable to authenticated" on bounties;
create policy "bounties full row owner or staff"
  on bounties for select to authenticated
  using ( created_by = auth.uid() or is_staff(auth.uid()) );
```
Then point the board UI's `select` at `bounties_public` instead of
`bounties`. (If `is_staff` doesn't exist, use whatever staff check you
already have — a `profiles.role = 'staff'` lookup, etc.)

### finding #2 — bounty_payments INSERT
Confirm payment rows are written **only** by the Stripe webhook / an edge
function using `service_role` (which bypasses RLS). If yes: no change —
add a comment on the table saying "INSERT is service-role only by
design." If a creator's browser ever inserts directly, add:
```sql
create policy "creators insert payments on own bounties"
  on bounty_payments for insert to authenticated
  with check (exists (
    select 1 from bounties b
    where b.id = bounty_id and b.created_by = auth.uid()));
```
Grep the repo for `.from('bounty_payments').insert` to decide.

### finding #3 — dependency
`npm audit --json`; upgrade `@tanstack/react-start` to the highest
patched 1.x. Only jump to 2.x if the fix isn't backported.

---

## 4. inbound edge functions (copula → bountysounds)

Three functions. Each: read raw body → verify HMAC → use a service-role
Supabase client → do the DB write. All reject with 401 on bad signature.

### `bridge-contracts`  (POST)
Publish a copula brief as a contract.
- Body: `{ copulaBriefId, artistSlug, title, direction, soundUrl,
  captionTemplate, coverUrl, potCents, ratePer100kCents, deadline }`
- Upsert `bounties` on `copula_brief_id` (idempotent — re-publish updates).
- Return `{ contractId, boardUrl }`.

### `bridge-claims`  (POST)
A fan submitted a clip in copula.
- Body: `{ contractId, copulaUserId, copulaClipId, clipUrl, tiktokHandle }`
- Insert `bounty_claims` (unique on `copula_clip_id` → re-send is a no-op,
  return the existing claim).
- Return `{ claimId }`.

### `bridge-claims-approve`  (POST)
copula moderation passed → make the claim payout-eligible.
- Body: `{ copulaClipId, decision }`  (`"approved"` | `"rejected"`)
- Set `bounty_claims.status` = `approved` (or `rejected`). Only an
  `approved` claim is eligible for the view-verification sweep.
- Return `{ ok: true }`.

---

## 5. outbound: report verified views back to copula

Wherever bountysounds already computes verified views (its cron / TikTok
poller), after updating a claim's `verified_views` and paying out, POST
to copula so the fan sees cash + the trusted view count:

`POST {COPULA_BASE_URL}/api/bountysounds/views`
sign the body with `BRIDGE_SHARED_SECRET`:
```json
{
  "copulaClipId": "…",
  "verifiedViews": 340000,
  "paidCents": 680,
  "idempotencyKey": "payout:<claimId>:<yyyy-mm-dd>"
}
```
copula dedupes on `idempotencyKey`, so send freely on every sweep.

Only run the sweep on claims with `status = 'approved'` — that's how
copula's human moderation gate actually protects the pot: an unmoderated
or rejected clip never reaches the payout path.

---

## 6. the money model (keep these true)

- **Human gate before cash.** A claim is only swept for views/payout after
  copula's moderator approves it. This is the fraud filter — no bot-farmed
  clip drains a pot without a person confirming it's real and on-brief.
- **Escrow the pot up front.** `funded_cash_cents` should be real money
  held (Stripe) when the contract is published, not a promise. A board of
  empty pots converts nobody.
- **Clippers are contractors.** Stripe Connect for payouts, 1099 tracking,
  and check TikTok's ToS on paid engagement before volume. Lawyer hour.

---

## paste this into Lovable

> Add a server-side bridge so an external app (copula) can publish
> bounties, submit clip claims, and approve them, and so we report
> verified views back. Build it as Supabase Edge Functions that verify an
> HMAC-SHA256 signature (header `X-Bountysounds-Signature`, secret
> `BRIDGE_SHARED_SECRET`) over the raw request body using
> `crypto.timingSafeEqual`, and use a service-role Supabase client.
>
> 1. Migration: add `copula_brief_id text unique` and `artist_slug text`
>    to `bounties`. Create a `bounty_claims` table (bounty_id fk,
>    copula_user_id text, copula_clip_id text unique, clip_url, tiktok_handle,
>    status default 'submitted', verified_views bigint default 0, paid_cents
>    int default 0, timestamps).
> 2. Fix RLS: create a `bounties_public` view exposing only id, title,
>    description, sound_url, cover_url, artist_slug, rate_per_100k_cents,
>    deadline, status, created_at; grant select to authenticated + anon;
>    restrict full-row select on `bounties` to owner or staff only; repoint
>    the board UI at `bounties_public`.
> 3. Edge function `bridge-contracts`: upsert a bounty by copula_brief_id
>    from the posted fields, return { contractId, boardUrl }.
> 4. Edge function `bridge-claims`: insert a bounty_claims row (idempotent
>    on copula_clip_id), return { claimId }.
> 5. Edge function `bridge-claims-approve`: set the claim's status to
>    approved/rejected by copula_clip_id.
> 6. In the verified-views job, only process claims with status 'approved',
>    and after paying out POST to `${COPULA_BASE_URL}/api/bountysounds/views`
>    with an HMAC-signed body { copulaClipId, verifiedViews, paidCents,
>    idempotencyKey }.
>
> Also confirm bounty_payments INSERT is service-role only and add a
> comment saying so.
