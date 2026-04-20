import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createDiaryEntry, DIARY_MOODS } from "@/lib/diary";
import { track } from "@/lib/analytics";

const CreateSchema = z.object({
  text: z.string().min(1).max(4000),
  mood: z.enum(DIARY_MOODS as [string, ...string[]]),
  trackTitle: z.string().max(200).optional().nullable(),
  trackUrl: z.string().url().optional().nullable(),
  sharedWithEbril: z.boolean().default(false),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const entries = await prisma.diaryEntry.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { entry, credited, pointsAwarded } = await createDiaryEntry({
    userId: session.userId,
    text: parsed.data.text,
    mood: parsed.data.mood as never,
    trackTitle: parsed.data.trackTitle ?? null,
    trackUrl: parsed.data.trackUrl ?? null,
    sharedWithEbril: parsed.data.sharedWithEbril,
  });

  await track(
    "page.viewed",
    { kind: "diary.entry", mood: entry.mood, credited },
    session.userId
  );

  return NextResponse.json({ entry, credited, pointsAwarded });
}
