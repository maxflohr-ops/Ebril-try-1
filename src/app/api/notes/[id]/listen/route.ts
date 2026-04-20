import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";

const Schema = z.object({
  secondsListened: z.number().int().min(0).max(60 * 60 * 6),
  completed: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // AudioPlayer throttles to one report per 15s of playtime, so a healthy
  // fan lands far under 40/min. This is just a cheap floor against tight
  // loops from a modified client.
  const limit = rateLimit(`listen:${session.userId}`, 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const note = await prisma.voiceNote.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      active: true,
      durationSec: true,
      tierRequiredId: true,
    },
  });
  if (!note || !note.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // tier gate re-check — never trust client
  if (note.tierRequiredId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { currentTier: { select: { sortOrder: true } } },
    });
    const required = await prisma.tier.findUnique({
      where: { id: note.tierRequiredId },
      select: { sortOrder: true },
    });
    if (!required || (user?.currentTier?.sortOrder ?? 0) < required.sortOrder) {
      return NextResponse.json({ error: "tier_locked" }, { status: 403 });
    }
  }

  const secondsListened = Math.min(parsed.data.secondsListened, note.durationSec);
  const completed =
    parsed.data.completed === true ||
    secondsListened / note.durationSec >= 0.85;

  const existing = await prisma.voiceNoteListen.findUnique({
    where: { userId_voiceNoteId: { userId: session.userId, voiceNoteId: note.id } },
  });

  const record = await prisma.voiceNoteListen.upsert({
    where: { userId_voiceNoteId: { userId: session.userId, voiceNoteId: note.id } },
    update: {
      secondsListened: Math.max(existing?.secondsListened ?? 0, secondsListened),
      completedAt: existing?.completedAt ?? (completed ? new Date() : null),
    },
    create: {
      userId: session.userId,
      voiceNoteId: note.id,
      secondsListened,
      completedAt: completed ? new Date() : null,
    },
  });

  return NextResponse.json({
    listen: {
      id: record.id,
      secondsListened: record.secondsListened,
      completedAt: record.completedAt,
    },
  });
}
