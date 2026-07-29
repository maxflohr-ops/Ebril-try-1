import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron";
import { reconcilePledgeForUser } from "@/lib/patreon-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const batchSize = 50;
  let cursor: string | undefined;
  let ok = 0;
  let skipped = 0;
  let errors = 0;
  let pledgeChanged = 0;
  let tierChanged = 0;

  while (true) {
    const users = await prisma.user.findMany({
      where: { patreonRefreshToken: { not: null } },
      select: { id: true },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (users.length === 0) break;

    for (const u of users) {
      const r = await reconcilePledgeForUser(u.id);
      if (r.status === "ok") ok++;
      else if (r.status === "skipped") skipped++;
      else errors++;
      if (r.pledgeChanged) pledgeChanged++;
      if (r.tierChanged) tierChanged++;
    }

    cursor = users[users.length - 1].id;
    if (users.length < batchSize) break;
  }

  return NextResponse.json({ ok, skipped, errors, pledgeChanged, tierChanged });
}

export const GET = run;
export const POST = run;
