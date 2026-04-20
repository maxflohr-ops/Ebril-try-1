import crypto from "node:crypto";
import { prisma } from "./db";
import { credit, defaultExpiry } from "./points";

const WINDOW_BEFORE_MS = 4 * 60 * 60 * 1000;  // 4h before showtime
const WINDOW_AFTER_MS = 8 * 60 * 60 * 1000;   // 8h after

export function tokenFor(tourDateId: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(tourDateId)
    .digest("hex")
    .slice(0, 16);
}

export function verifyToken(tourDateId: string, secret: string, provided: string): boolean {
  const expected = tokenFor(tourDateId, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function checkinUrl(baseUrl: string, tourDateId: string, secret: string): string {
  const t = tokenFor(tourDateId, secret);
  return `${baseUrl.replace(/\/$/, "")}/api/shows/${tourDateId}/checkin?t=${t}`;
}

export interface CheckinResult {
  ok: boolean;
  reason?: "bad_token" | "too_early" | "too_late" | "not_found" | "already";
  pointsAwarded?: number;
}

export async function performCheckin(
  userId: string,
  tourDateId: string,
  providedToken: string,
  message?: string | null
): Promise<CheckinResult> {
  const tour = await prisma.tourDate.findUnique({ where: { id: tourDateId } });
  if (!tour) return { ok: false, reason: "not_found" };
  if (!verifyToken(tour.id, tour.qrSecret, providedToken)) {
    return { ok: false, reason: "bad_token" };
  }

  const now = Date.now();
  const start = tour.startsAt.getTime();
  if (now < start - WINDOW_BEFORE_MS) return { ok: false, reason: "too_early" };
  if (now > start + WINDOW_AFTER_MS) return { ok: false, reason: "too_late" };

  const existing = await prisma.tourCheckin.findUnique({
    where: { userId_tourDateId: { userId, tourDateId: tour.id } },
  });
  if (existing) {
    if (message && message !== existing.message) {
      await prisma.tourCheckin.update({
        where: { id: existing.id },
        data: { message },
      });
    }
    return { ok: true, reason: "already", pointsAwarded: 0 };
  }

  await prisma.tourCheckin.create({
    data: { userId, tourDateId: tour.id, message: message ?? null },
  });

  if (tour.pointsReward > 0) {
    await credit({
      userId,
      amountCents: 0,
      reason: "show_checkin",
      refId: `show:${tour.id}:${userId}`,
      flatBonus: tour.pointsReward,
      expiresAt: defaultExpiry(),
    });
  }

  return { ok: true, pointsAwarded: tour.pointsReward };
}
