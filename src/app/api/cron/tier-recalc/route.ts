import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recalcUserTier } from "@/lib/tiers";
import { isAuthorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const batchSize = 200;
  let cursor: string | undefined;
  let processed = 0;
  let changed = 0;

  while (true) {
    const users = await prisma.user.findMany({
      select: { id: true, currentTierId: true },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (users.length === 0) break;

    for (const u of users) {
      const newTier = await recalcUserTier(u.id);
      const newTierId = newTier?.id ?? null;
      if (newTierId !== u.currentTierId) changed++;
      processed++;
    }
    cursor = users[users.length - 1].id;
    if (users.length < batchSize) break;
  }

  return NextResponse.json({ ok: true, processed, changed });
}

export const GET = run;
export const POST = run;
