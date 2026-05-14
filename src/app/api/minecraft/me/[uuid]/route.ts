import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  minecraftSharedSecret,
  normalizeMcUuid,
  unauthorized,
  verifyPayload,
} from "@/lib/minecraft";
import { getBalance } from "@/lib/points";

export const runtime = "nodejs";

/**
 * Server → copula: pull a player's current state. The plugin calls this
 * on login (or on `/copula sync`) and grants in-game rewards based on
 * the response — ranks, cosmetics, area access, etc.
 *
 * GET requests still need a signature but since there's no body we sign
 * the empty string. Plugins compute HMAC-SHA256 over "" with the shared
 * secret.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { uuid: string } }
) {
  const secret = minecraftSharedSecret();
  if (!secret) return unauthorized("missing_secret");
  const sig = req.headers.get("x-copula-signature");
  if (!verifyPayload("", sig, secret)) return unauthorized("bad_signature");

  const mcUuid = normalizeMcUuid(params.uuid);
  if (!mcUuid) return NextResponse.json({ error: "invalid_uuid" }, { status: 400 });

  const account = await prisma.minecraftAccount.findUnique({ where: { mcUuid } });
  if (!account) return NextResponse.json({ linked: false }, { status: 404 });

  // Stamp last-seen so the admin can see who's active in-game.
  await prisma.minecraftAccount.update({
    where: { id: account.id },
    data: { lastSeenAt: new Date() },
  });

  const [user, balance, grants, seasonGrants] = await Promise.all([
    prisma.user.findUnique({
      where: { id: account.userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        currentTier: { select: { name: true, sortOrder: true } },
      },
    }),
    getBalance(account.userId),
    prisma.collectibleGrant.findMany({
      where: { userId: account.userId },
      include: { collectible: { select: { key: true, rarity: true } } },
    }),
    prisma.seasonPassGrant.findMany({
      where: { userId: account.userId },
      include: {
        reward: { select: { key: true, kind: true, season: { select: { slug: true } } } },
      },
    }),
  ]);
  if (!user) return NextResponse.json({ linked: false }, { status: 404 });

  return NextResponse.json({
    linked: true,
    copulaUserId: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    tier: user.currentTier
      ? { name: user.currentTier.name, sortOrder: user.currentTier.sortOrder }
      : null,
    balance,
    collectibles: grants.map((g) => ({
      key: g.collectible.key,
      rarity: g.collectible.rarity,
      grantedAt: g.grantedAt,
    })),
    seasonRewards: seasonGrants.map((g) => ({
      key: g.reward.key,
      kind: g.reward.kind,
      season: g.reward.season.slug,
      grantedAt: g.grantedAt,
    })),
    mcUsername: account.mcUsername,
  });
}
