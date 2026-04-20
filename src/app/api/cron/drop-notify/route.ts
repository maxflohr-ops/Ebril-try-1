import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron";
import { notifySubscribersForSong } from "@/lib/dropNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Window: songs whose releaseDate is in the last 36h. This gives us a buffer
  // for a scheduled-release that ran before the cron's next tick, and a
  // cushion for manual late-publishes. Each subscription is idempotent via
  // notifiedAt, so re-entering the same window is safe.
  const now = new Date();
  const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000);

  const songs = await prisma.song.findMany({
    where: {
      active: true,
      releaseDate: { gte: windowStart, lte: now },
    },
    select: { id: true },
  });

  const results = [];
  for (const s of songs) {
    try {
      results.push(await notifySubscribersForSong(s.id));
    } catch (err) {
      console.error("[cron drop-notify]", s.id, err);
    }
  }

  return NextResponse.json({ ok: true, songs: results.length, results });
}

export const GET = run;
export const POST = run;
