import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeMcUuid, readSignedRequest } from "@/lib/minecraft";
import { credit, defaultExpiry } from "@/lib/points";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

const MAX_GRANT = 5_000;

const Schema = z.object({
  mcUuid: z.string().min(16).max(40),
  points: z.number().int().min(1).max(MAX_GRANT),
  reason: z.string().min(3).max(120),
  idempotencyKey: z.string().min(4).max(80),
  notify: z.boolean().default(false),
});

/**
 * Server → copula: credit points for an in-game event (finishing a build,
 * completing a quest, playtime milestone, etc.). The plugin decides what
 * events count; we just accept the signed grant and write it to the
 * ledger.
 *
 * `idempotencyKey` is how we dedupe — set it to something stable per
 * event on the plugin side (e.g. "quest:ebril-dusk-build:<mcuuid>").
 * A repeat submission with the same key is a 200 no-op.
 */
export async function POST(req: NextRequest) {
  const parsed = await readSignedRequest<unknown>(req);
  if (!parsed.ok) return parsed.res;
  const body = Schema.safeParse(parsed.body);
  if (!body.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const mcUuid = normalizeMcUuid(body.data.mcUuid);
  if (!mcUuid) return NextResponse.json({ error: "invalid_uuid" }, { status: 400 });

  const account = await prisma.minecraftAccount.findUnique({ where: { mcUuid } });
  if (!account) return NextResponse.json({ error: "not_linked" }, { status: 404 });

  const refId = `mc:${body.data.idempotencyKey}`;

  const existing = await prisma.pointTransaction.findFirst({
    where: { userId: account.userId, refId },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      idempotent: true,
      pointsAwarded: existing.delta,
    });
  }

  await credit({
    userId: account.userId,
    amountCents: 0,
    reason: "minecraft_play",
    refId,
    flatBonus: body.data.points,
    expiresAt: defaultExpiry(),
  });

  if (body.data.notify) {
    await sendPushToUser(account.userId, {
      title: `+${body.data.points.toLocaleString()} points from the server`,
      body: body.data.reason,
      url: "/",
    });
  }

  return NextResponse.json({
    ok: true,
    idempotent: false,
    pointsAwarded: body.data.points,
  });
}
