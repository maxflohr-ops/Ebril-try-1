import { prisma } from "./db";
import { logAudit } from "./audit";

/**
 * Discord tier-role sync.
 *
 * This is REST-only — no always-on gateway bot. Discord lets a bot
 * token add/remove guild roles over plain HTTP, which is all we need
 * and the only thing that fits a serverless deploy (no long-lived
 * process to babysit). Everything here is best-effort: a Discord
 * outage, a missing role, or a fan who left the server must never
 * block a tier recalculation or throw into an auth path.
 *
 * Required env to turn it on:
 *   DISCORD_BOT_TOKEN   — the bot's token (Bot <token> auth)
 *   DISCORD_GUILD_ID    — Ebril's server id
 *   DISCORD_ROLE_FAN / _SUPERFAN / _VIP / _UNRANKED — role ids per tier
 *
 * The bot must have MANAGE_ROLES and sit *above* every managed role in
 * the server's role list, or Discord returns 403 on the role calls.
 */

const API = "https://discord.com/api/v10";

// copula tier.sortOrder → env var holding the Discord role id.
const TIER_ROLE_ENV: Record<number, string> = {
  0: "DISCORD_ROLE_UNRANKED",
  1: "DISCORD_ROLE_FAN",
  2: "DISCORD_ROLE_SUPERFAN",
  3: "DISCORD_ROLE_VIP",
};

export function isBotConfigured(): boolean {
  return !!process.env.DISCORD_BOT_TOKEN && !!process.env.DISCORD_GUILD_ID;
}

export function roleForTier(sortOrder: number): string | null {
  const key = TIER_ROLE_ENV[sortOrder];
  if (!key) return null;
  return process.env[key] || null;
}

/** Every tier role id we manage, so we can strip stale ones on change. */
export function managedRoleIds(): string[] {
  return Object.values(TIER_ROLE_ENV)
    .map((k) => process.env[k])
    .filter((v): v is string => !!v);
}

async function discordFetch(
  path: string,
  init: RequestInit & { reason?: string } = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${API}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "content-type": "application/json",
        ...(init.reason ? { "x-audit-log-reason": init.reason } : {}),
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Discord rate-limits per-route; on a 429 it returns the wait in
// `retry_after` seconds. We respect exactly one retry, capped, so a
// throttled call self-heals without ever stalling the caller for long.
async function withOneRetry(fn: () => Promise<Response>): Promise<Response> {
  let res = await fn();
  if (res.status === 429) {
    let waitMs = 1000;
    try {
      const body = (await res.clone().json()) as { retry_after?: number };
      if (typeof body.retry_after === "number") {
        waitMs = Math.min(Math.ceil(body.retry_after * 1000), 5000);
      }
    } catch {
      /* fall back to the 1s default */
    }
    await new Promise((r) => setTimeout(r, waitMs));
    res = await fn();
  }
  return res;
}

export interface SyncResult {
  ok: boolean;
  reason?: string;
  added?: string[];
  removed?: string[];
}

/**
 * Reconcile the linked Discord member's tier roles to match copula.
 * Idempotent: reads current roles first and only issues add/remove
 * calls for the deltas, so a daily full sweep is cheap and a no-op in
 * steady state. Never throws.
 */
export async function syncTierRole(userId: string): Promise<SyncResult> {
  if (!isBotConfigured()) return { ok: false, reason: "not_configured" };

  const managed = managedRoleIds();
  if (managed.length === 0) return { ok: false, reason: "no_roles_mapped" };

  const account = await prisma.discordAccount.findUnique({
    where: { userId },
    select: {
      discordUserId: true,
      user: { select: { currentTier: { select: { sortOrder: true } } } },
    },
  });
  if (!account) return { ok: false, reason: "no_discord" };

  const guild = process.env.DISCORD_GUILD_ID as string;
  const uid = account.discordUserId;
  const sortOrder = account.user.currentTier?.sortOrder ?? 0;
  const desired = roleForTier(sortOrder);

  try {
    const memberRes = await withOneRetry(() =>
      discordFetch(`/guilds/${guild}/members/${uid}`, { method: "GET" })
    );
    if (memberRes.status === 404) return { ok: false, reason: "not_in_guild" };
    if (!memberRes.ok) return { ok: false, reason: `member_${memberRes.status}` };

    const member = (await memberRes.json()) as { roles?: string[] };
    const current = new Set(member.roles ?? []);

    const toAdd = desired && !current.has(desired) ? [desired] : [];
    const toRemove = managed.filter((r) => r !== desired && current.has(r));

    for (const r of toRemove) {
      await withOneRetry(() =>
        discordFetch(`/guilds/${guild}/members/${uid}/roles/${r}`, {
          method: "DELETE",
          reason: "copula tier sync",
        })
      );
    }
    for (const r of toAdd) {
      await withOneRetry(() =>
        discordFetch(`/guilds/${guild}/members/${uid}/roles/${r}`, {
          method: "PUT",
          reason: "copula tier sync",
        })
      );
    }

    if (toAdd.length || toRemove.length) {
      await logAudit(userId, "discord.role_sync", null, {
        sortOrder,
        added: toAdd,
        removed: toRemove,
      });
    }
    return { ok: true, added: toAdd, removed: toRemove };
  } catch (err) {
    console.error("discord role sync:", err);
    return { ok: false, reason: "exception" };
  }
}

/** Never-throwing wrapper for hot paths (tier recalc, auth callbacks). */
export async function syncTierRoleSafe(userId: string): Promise<void> {
  try {
    await syncTierRole(userId);
  } catch (err) {
    console.error("discord role sync (safe):", err);
  }
}
