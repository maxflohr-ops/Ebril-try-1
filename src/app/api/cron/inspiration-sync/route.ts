import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron";
import { syncDirectionFeed } from "@/lib/inspirationSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const directions = await prisma.clippingBrief.findMany({
    where: { active: true, inspirationFeedUrl: { not: null } },
    select: { id: true },
  });

  const results = [];
  for (const d of directions) {
    try {
      const r = await syncDirectionFeed(d.id);
      if (r) results.push(r);
    } catch (err) {
      console.error("[inspiration-sync]", d.id, err);
    }
  }

  return NextResponse.json({ ok: true, synced: results.length, results });
}

export const GET = run;
export const POST = run;
