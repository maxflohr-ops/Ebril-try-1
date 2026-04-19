import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const expired = await prisma.pointTransaction.findMany({
    where: { delta: { gt: 0 }, expiresAt: { lt: now } },
    select: { id: true, userId: true, delta: true, expiresAt: true },
    take: 5000,
  });

  let written = 0;
  for (const t of expired) {
    const refId = `expire:${t.id}`;
    const exists = await prisma.pointTransaction.findFirst({
      where: { userId: t.userId, refId, reason: "expiry" },
    });
    if (exists) continue;

    await prisma.pointTransaction.create({
      data: {
        userId: t.userId,
        delta: -t.delta,
        reason: "expiry",
        refId,
        expiresAt: null,
      },
    });
    written++;
  }

  return NextResponse.json({ ok: true, expired: written });
}

export const GET = run;
export const POST = run;
