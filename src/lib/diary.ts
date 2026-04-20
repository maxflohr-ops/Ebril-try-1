import { DiaryMood } from "@prisma/client";
import { prisma } from "./db";
import { credit, defaultExpiry } from "./points";

export const DIARY_POINTS = 10;
export const DIARY_MOODS: DiaryMood[] = [
  "dusk",
  "dawn",
  "threeam",
  "aching",
  "open",
  "alone",
  "together",
  "commute",
];

export const MOOD_LABEL: Record<DiaryMood, string> = {
  dusk: "dusk",
  dawn: "dawn",
  threeam: "3am",
  aching: "aching",
  open: "open",
  alone: "alone",
  together: "together",
  commute: "commute",
};

function todayRefId(userId: string, now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `diary:${userId}:${y}${m}${d}`;
}

export interface CreateDiaryInput {
  userId: string;
  text: string;
  mood: DiaryMood;
  trackTitle?: string | null;
  trackUrl?: string | null;
  sharedWithEbril: boolean;
}

export async function createDiaryEntry(input: CreateDiaryInput) {
  const entry = await prisma.diaryEntry.create({
    data: {
      userId: input.userId,
      text: input.text.trim(),
      mood: input.mood,
      trackTitle: input.trackTitle?.trim() || null,
      trackUrl: input.trackUrl?.trim() || null,
      sharedWithEbril: input.sharedWithEbril,
    },
  });

  const refId = todayRefId(input.userId);
  const already = await prisma.pointTransaction.findFirst({
    where: { userId: input.userId, refId },
  });
  let credited = false;
  if (!already) {
    await credit({
      userId: input.userId,
      amountCents: 0,
      reason: "diary_entry",
      refId,
      flatBonus: DIARY_POINTS,
      expiresAt: defaultExpiry(),
    });
    credited = true;
  }

  return { entry, credited, pointsAwarded: credited ? DIARY_POINTS : 0 };
}

export async function consecutiveEntryDays(userId: string): Promise<number> {
  const entries = await prisma.diaryEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 60,
  });
  if (entries.length === 0) return 0;

  const days = new Set<string>();
  for (const e of entries) {
    const y = e.createdAt.getUTCFullYear();
    const m = e.createdAt.getUTCMonth();
    const d = e.createdAt.getUTCDate();
    days.add(`${y}-${m}-${d}`);
  }

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}-${cursor.getUTCDate()}`;
    if (!days.has(key)) {
      if (streak === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }
      break;
    }
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (streak > 60) break;
  }
  return streak;
}
