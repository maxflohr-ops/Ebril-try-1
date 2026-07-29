import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { encryptMaybe } from "@/lib/crypto";
import { exchangeCode, fetchIdentity } from "@/lib/discord";
import { syncTierRoleSafe } from "@/lib/discordBot";

export const runtime = "nodejs";

function back(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL("/profile", req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return back(req, { discord: "no_session" });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthErr = url.searchParams.get("error");

  const stored = session.discordOauthState;
  const sameLength = !!code && !!state && !!stored && state.length === stored.length;
  const stateOk =
    sameLength &&
    crypto.timingSafeEqual(Buffer.from(state as string), Buffer.from(stored as string));
  session.discordOauthState = undefined;
  await session.save();

  if (oauthErr) return back(req, { discord: "denied" });
  if (!stateOk || !code) return back(req, { discord: "invalid_state" });

  try {
    const tokens = await exchangeCode(code);
    const identity = await fetchIdentity(tokens.access_token);

    const existing = await prisma.discordAccount.findUnique({
      where: { discordUserId: identity.id },
      select: { userId: true },
    });
    if (existing && existing.userId !== session.userId) {
      return back(req, { discord: "id_taken" });
    }

    const encAccess = encryptMaybe(tokens.access_token) ?? tokens.access_token;
    const encRefresh = encryptMaybe(tokens.refresh_token) ?? tokens.refresh_token;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.discordAccount.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        discordUserId: identity.id,
        username: identity.username,
        globalName: identity.globalName,
        avatarHash: identity.avatarHash,
        accessToken: encAccess,
        refreshToken: encRefresh,
        tokenExpires: expiresAt,
      },
      update: {
        discordUserId: identity.id,
        username: identity.username,
        globalName: identity.globalName,
        avatarHash: identity.avatarHash,
        accessToken: encAccess,
        refreshToken: encRefresh,
        tokenExpires: expiresAt,
      },
    });

    await logAudit(session.userId, "discord.link", null, {
      discordUserId: identity.id,
      username: identity.username,
    });

    // Apply their current tier role right away so the server reflects
    // their standing the moment they link. Best-effort.
    await syncTierRoleSafe(session.userId);

    return back(req, { discord: "linked" });
  } catch (err) {
    console.error("discord callback:", err);
    return back(req, { discord: "error" });
  }
}
