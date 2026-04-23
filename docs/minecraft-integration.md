# minecraft ↔ copula — plugin contract

This is the exact HTTP contract between Ebril's Minecraft server plugin
and the copula backend. If you (or whoever writes the plugin) hit these
endpoints with these payloads, in-game rewards, tier sync, and point
grants will just work.

The plugin itself is not in this repo — it's Java/Kotlin code that runs
inside Spigot / Paper / Velocity. You can write it, hire it, or fork an
existing "link your account with a web app" plugin template and swap the
endpoints. Every detail you need to do that is below.

---

## environment

Set a single env var on the copula side:

```
MINECRAFT_SHARED_SECRET=<openssl rand -hex 32>
```

Same string goes into the plugin's config. Rotate it by regenerating and
updating both sides. With the secret unset, every server endpoint
returns 503 `missing_secret` so you can't accidentally run the plugin
against a misconfigured backend.

Base URL: `APP_BASE_URL` from the copula environment
(e.g. `https://copula.ebril.com`).

---

## auth — HMAC-SHA256

Every server-initiated request carries one header:

```
X-Copula-Signature: <hex HMAC-SHA256(body, MINECRAFT_SHARED_SECRET)>
```

- For `POST` requests, the body is the raw JSON you're sending.
- For `GET` requests (just one — `/me/:uuid`), the body is the empty
  string `""`.

Signature must be 64 lowercase hex chars. Copula uses
`crypto.timingSafeEqual`, so no length-extension games.

Pseudocode for a plugin:

```java
String body = mapper.writeValueAsString(payload);   // "" for GET
Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(secret.getBytes(UTF_8), "HmacSHA256"));
String sig = HexFormat.of().formatHex(mac.doFinal(body.getBytes(UTF_8)));
```

Failure modes:

| status | meaning |
|---|---|
| `503 missing_secret` | copula hasn't set `MINECRAFT_SHARED_SECRET`; tell Ebril's admin |
| `401 bad_signature`  | signature header absent, wrong length, or didn't match |

---

## the four endpoints

All JSON bodies. All responses JSON unless noted.

### 1 · POST `/api/minecraft/verify`

> Called when a fan types `/copula link XXX-XXX` in-game.

Request body:

```json
{
  "code":       "XXX-XXX",
  "mcUuid":     "abcdef12-3456-7890-abcd-ef1234567890",
  "mcUsername": "hana_dusk"
}
```

- `code` — the 6-char (plus dash) pairing code the fan sees on
  `/profile` after tapping **link my minecraft account**. Case-insensitive;
  copula uppercases it server-side. Alphabet is `A-Z 2-9` minus
  `I O L 0 1` so voice dictation in Discord works.
- `mcUuid` — the player's Mojang UUID in any format. Dashes optional.
- `mcUsername` — current in-game name.

Success `200`:

```json
{
  "ok": true,
  "copulaUserId": "…uuid…",
  "mcUsername": "hana_dusk"
}
```

Errors:

| status | body | meaning |
|---|---|---|
| `400` | `{"error":"unknown_code"}`       | no such code |
| `400` | `{"error":"code_expired"}`       | > 10 minutes old |
| `400` | `{"error":"code_already_used"}`  | pair already consumed the code |
| `400` | `{"error":"invalid_uuid"}`       | UUID didn't parse |
| `409` | `{"error":"uuid_already_linked"}`| this mc account already paired to a different copula user |

Idempotency: re-running with the same code after success returns
`code_already_used` (distinct from the success body). Fan just tries again.

### 2 · GET `/api/minecraft/me/[uuid]`

> Call on login or `/copula sync` to get everything you need to apply
> ranks, cosmetics, and access rules.

Request body: empty. Sign `""`.

Success `200`:

```json
{
  "linked": true,
  "copulaUserId": "…uuid…",
  "displayName": "hana",
  "avatarUrl": "https://…",
  "tier": { "name": "Superfan", "sortOrder": 2 },
  "balance": 650,
  "collectibles": [
    { "key": "welcome_in", "rarity": "common",  "grantedAt": "2026-04-06T…Z" },
    { "key": "held_clip",  "rarity": "rare",    "grantedAt": "2026-04-18T…Z" }
  ],
  "mcUsername": "hana_dusk"
}
```

The plugin should translate these into in-game state:

- **`tier.sortOrder`** → permission group. `0` = unranked, `1` = Fan,
  `2` = Superfan, `3` = VIP. Stable integer so new tiers don't
  silently break you.
- **`collectibles[].key`** → unlocks. `welcome_in` = spawn access,
  `held_clip` = a cosmetic title, `tier_vip` = the private build
  region, etc. Map these in plugin config.
- **`balance`** → optional vanity display (`/balance` in chat).

`404 {"linked": false}` if that UUID isn't paired to anyone.

### 3 · POST `/api/minecraft/grant`

> Credit copula points for an in-game event (playtime milestone,
> finishing a quest/build, attending a live-show session in-game, etc).

Request body:

```json
{
  "mcUuid":         "abcdef12-3456-7890-abcd-ef1234567890",
  "points":         100,
  "reason":         "first hour on the dusk server",
  "idempotencyKey": "playtime:hana_dusk:20260420-01",
  "notify":         false
}
```

- `points` — 1 to 5000 inclusive. Hard cap to prevent a bad plugin build
  from minting points.
- `reason` — appears in the audit log and optionally in the push
  notification body. Keep it short and in voice.
- `idempotencyKey` — **stable per event**. Copula stores a row at
  `refId = mc:<idempotencyKey>` and refuses to double-credit. Good
  shapes:
  - `quest:<quest-id>:<mcuuid>`
  - `playtime:<mcuuid>:<YYYYMMDD-HH>` for hourly ticks
  - `show:<show-id>:<mcuuid>` for live-show attendance
- `notify` — set true to push the fan "+100 pts from the server" on
  their phone. Default false — don't spam.

Success `200`:

```json
{ "ok": true, "idempotent": false, "pointsAwarded": 100 }
```

Repeat call with the same `idempotencyKey` → `200` with `"idempotent":
true` and the original amount. Plugin can retry freely.

Errors:

| status | meaning |
|---|---|
| `400 invalid_payload` | zod rejected the shape |
| `404 not_linked`       | that UUID isn't paired |
| `503 missing_secret`   | copula misconfigured |

### 4 · POST `/api/minecraft/link` *(fan-side — not called by the plugin)*

This is the fan's browser hitting copula to mint a pairing code. The
plugin never calls it — documented here only so you understand the full
loop.

Fan's `/profile` → click **link my minecraft account** → fetch hits this
endpoint → response is `{code, expiresAt}`. The fan copies the code and
types it in-game, which triggers your plugin to call endpoint #1.

---

## recommended plugin surface

Minimum viable plugin exposes three chat commands. Suggested names:

- `/copula link <code>` — calls `POST /verify`.
- `/copula sync` — calls `GET /me/:uuid` and re-applies rank + perms.
  Also runs automatically on login.
- `/copula balance` — prints the fan's balance from the last sync.

Suggested plugin-internal cron tasks:

- Every 60 min: for each online player with a linked account, call
  `/grant` with `idempotencyKey=playtime:<mcuuid>:<YYYYMMDD-HH>` and
  `points=5` (or whatever rate feels right). Keep it small — points
  are supposed to feel earned.
- Every 24 hours: re-sync all linked accounts via `/me/:uuid` so new
  tier / collectible changes land even for fans who haven't logged
  in for a bit.

---

## testing the contract

From your laptop with `MINECRAFT_SHARED_SECRET=dev`:

```bash
# mint a pairing code in copula (while signed in as a fan)
CODE=$(curl -fs -b cookies.txt -X POST http://localhost:3000/api/minecraft/link | jq -r .code)
echo "code: $CODE"

# pretend to be the plugin: verify the pairing
BODY='{"code":"'"$CODE"'","mcUuid":"abcdef1234567890abcdef1234567890","mcUsername":"hana_dusk"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac dev | awk '{print $2}')
curl -fs -X POST http://localhost:3000/api/minecraft/verify \
  -H "content-type: application/json" \
  -H "x-copula-signature: $SIG" \
  -d "$BODY" | jq

# pull the fan's state as the plugin would
SIG_EMPTY=$(printf '' | openssl dgst -sha256 -hmac dev | awk '{print $2}')
curl -fs -X GET "http://localhost:3000/api/minecraft/me/abcdef12-3456-7890-abcd-ef1234567890" \
  -H "x-copula-signature: $SIG_EMPTY" | jq

# credit 100 points for a fake quest
BODY='{"mcUuid":"abcdef1234567890abcdef1234567890","points":100,"reason":"finished the dusk build","idempotencyKey":"quest:dusk-build:hana_dusk"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac dev | awk '{print $2}')
curl -fs -X POST http://localhost:3000/api/minecraft/grant \
  -H "content-type: application/json" \
  -H "x-copula-signature: $SIG" \
  -d "$BODY" | jq
```

If those all succeed, the plugin contract is exercised end-to-end.

---

## audit + observability

Every server-initiated call lands in the copula audit log:

- `minecraft.link` → at `/verify` success
- `minecraft.unlink` → at `/unlink` success
- `manual_adjust` reasons won't show here; the `minecraft_play` ledger
  reason is separate and visible on `/wrapped` as *"minecraft"*.

Admin can see every linked account at `/admin/users` (fuzzy search by
username).

---

## what does *not* live in this contract

- Reward catalog mapping (`welcome_in` → "give spawn access") lives in
  the plugin's config, not in copula. Decouples the two so Ebril can
  change in-game rewards without a copula deploy.
- Cosmetic particles / chat prefix / title — those are plugin concerns
  even if they're gated on copula tier.
- Voice chat / Discord bridge — out of scope here; see any of the
  existing integrations (DiscordSRV, etc.).
