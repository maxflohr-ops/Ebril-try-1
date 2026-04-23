# copula — minecraft plugin

Paper/Spigot plugin that links ebril's minecraft server to the copula fan
app. Fans pair their in-game account with a short code, the plugin keeps
their tier + cassette unlocks in sync, and playtime turns into copula
points. Contract lives in `../docs/minecraft-integration.md` — this is a
working reference implementation of that contract.

Java 17, Paper API 1.20+, no runtime deps beyond what Paper bundles.

## build

```
cd plugin
mvn package
```

Output jar lands at `target/copula-plugin-0.1.0.jar`.

## install

1. Copy the jar into your server's `plugins/` folder.
2. Restart the server once so the plugin writes its default `config.yml`.
3. Edit `plugins/copula/config.yml`:
   - `copula.base-url` — where the copula backend is hosted
     (e.g. `https://copula.ebril.com`, no trailing slash).
   - `copula.shared-secret` — same value as `MINECRAFT_SHARED_SECRET`
     on the copula backend. Generate with `openssl rand -hex 32`.
   - `on-tier-change.*` and `on-collectible-earned.*` — console commands
     to run when a fan's tier changes or they earn a cassette. The
     examples assume LuckPerms, but any system works — it's just console
     commands with `{player}` / `{group}` substitution.
4. Restart once more to pick up your config.

## fan flow

In the copula app, a fan opens their profile and taps
**link my minecraft account**. They get a short code like `H4N-2KP`.
In-game they type:

```
/copula link H4N-2KP
```

The plugin verifies the code against copula, pairs the accounts, and
runs the configured tier commands. Subsequent logins re-sync
automatically.

## commands

| command | what it does |
|---|---|
| `/copula link <code>` | pair this minecraft account with a copula user |
| `/copula sync`        | re-pull tier + cassettes (also runs on every login) |
| `/copula balance`     | print the fan's copula points |
| `/copula unlink`      | reminds the fan to unlink from the copula app |

## how it's wired

- `CopulaPlugin` loads config, instantiates the HTTP client, registers
  the command + listener, and schedules `PlaytimeTask`.
- `ApiClient` wraps Java 17's `HttpClient` and signs every request with
  HMAC-SHA256 over the exact body bytes. GETs are signed with the empty
  string. Never blocks the main thread.
- `LoginListener` fires `/api/minecraft/me/:uuid` on join. On `404` it
  nudges the fan to link. On `200` it hands off to `TierSync`.
- `TierSync` runs the configured console commands for the fan's
  `tier.sortOrder` (0/1/2/3 → unranked/fan/superfan/vip) and fires
  `on-collectible-earned.<key>` commands exactly once per player,
  tracked in `applied-collectibles.yml` under the plugin's data folder.
- `PlaytimeTask` runs on the `playtime.minutes-between-grants` schedule
  and calls `/api/minecraft/grant` with
  `idempotencyKey=playtime:<uuid>:<yyyymmddhh>`. The backend dedupes on
  that refId, so the grant is safe to retry — at worst it's a no-op.
- `CollectibleStore` persists applied collectibles per-player in a
  local YAML file so the one-time commands actually fire exactly once.

## rotating the shared secret

1. On the copula backend, generate a new secret with
   `openssl rand -hex 32` and update `MINECRAFT_SHARED_SECRET`.
2. Update `copula.shared-secret` in `plugins/copula/config.yml` to the
   same value.
3. Restart the minecraft server.

No fan re-pairing needed — the secret only signs server-to-server
traffic, not the pairing itself.

## extending

- Grant points for quests: from any plugin or command, call
  `ApiClient.grant(uuid, points, reason, "quest:<id>:<uuid>", true)`.
- Grant points for live-show attendance: same pattern with
  `show:<show-id>:<uuid>`.
- New tier? Set `tier.sortOrder=4` on the copula side and add an
  `on-tier-change.legend:` block to config.yml. Old plugins keep
  working because unknown sortOrders fall back to `unranked`.

## troubleshooting

- **`copula: base-url or shared-secret not configured`** — edit
  `plugins/copula/config.yml`, then restart.
- **`couldn't link: that code expired`** — codes are 10-minute TTL.
  Generate a new one in the app.
- **`uuid_already_linked`** — this minecraft UUID is already paired
  with a different copula user. That fan needs to unlink from their
  copula profile first.
- **Silent failures on join** — copula is unreachable or returning
  non-2xx. Check the server log for `copula GET /api/minecraft/me/...
  failed: ...`.
