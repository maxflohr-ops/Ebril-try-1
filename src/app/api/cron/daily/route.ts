import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthorizedCron } from "@/lib/cron";
import { credit, defaultExpiry } from "@/lib/points";
import { sendEmail } from "@/lib/email";
import {
  BIRTHDAY_BONUS,
  STREAK_REWARDS,
  consecutiveChargeMonths,
} from "@/lib/streaks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayMM = String(now.getUTCMonth() + 1).padStart(2, "0");
  const todayDD = String(now.getUTCDate()).padStart(2, "0");
  const yyyy = now.getUTCFullYear();

  const summary = { birthdays: 0, streaks: 0, expiryWarnings: 0 };

  // Birthdays
  const birthdayUsers = await prisma.user.findMany({
    where: { dob: { not: null } },
    select: { id: true, dob: true, email: true, displayName: true },
  });
  for (const u of birthdayUsers) {
    if (!u.dob) continue;
    const mm = String(u.dob.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(u.dob.getUTCDate()).padStart(2, "0");
    if (mm !== todayMM || dd !== todayDD) continue;

    const refId = `birthday:${u.id}:${yyyy}`;
    const exists = await prisma.pointTransaction.findFirst({
      where: { userId: u.id, refId },
    });
    if (exists) continue;

    await credit({
      userId: u.id,
      amountCents: 0,
      reason: "birthday",
      refId,
      flatBonus: BIRTHDAY_BONUS,
      expiresAt: defaultExpiry(),
    });
    summary.birthdays++;

    if (u.email) {
      await sendEmail({
        to: u.email,
        subject: "Happy birthday — bonus points dropped",
        text: `Hey ${u.displayName ?? "you"}, ${BIRTHDAY_BONUS} bonus points just landed in your Ebril Rewards balance. Treat yourself.`,
      });
    }
  }

  // Streak bonuses (only on the 1st of the month so credits don't compound)
  if (now.getUTCDate() === 1) {
    const activeUsers = await prisma.user.findMany({
      where: { pledges: { some: { status: "active" } } },
      select: { id: true },
    });
    for (const u of activeUsers) {
      const streak = await consecutiveChargeMonths(u.id);
      const reward = STREAK_REWARDS[streak];
      if (!reward) continue;
      const refId = `streak:${u.id}:${streak}`;
      const exists = await prisma.pointTransaction.findFirst({
        where: { userId: u.id, refId },
      });
      if (exists) continue;
      await credit({
        userId: u.id,
        amountCents: 0,
        reason: "streak",
        refId,
        flatBonus: reward,
      });
      summary.streaks++;
    }
  }

  // Point expiry warnings (30-day notice, dedupe via audit log)
  const horizon = new Date(now);
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  const expiringSoon = await prisma.pointTransaction.findMany({
    where: {
      delta: { gt: 0 },
      expiresAt: { gte: now, lte: horizon },
    },
    select: { id: true, userId: true, delta: true, expiresAt: true },
  });

  const byUser = new Map<string, { points: number; soonest: Date }>();
  for (const t of expiringSoon) {
    if (!t.expiresAt) continue;
    const cur = byUser.get(t.userId);
    if (!cur) byUser.set(t.userId, { points: t.delta, soonest: t.expiresAt });
    else {
      cur.points += t.delta;
      if (t.expiresAt < cur.soonest) cur.soonest = t.expiresAt;
    }
  }

  for (const [userId, agg] of byUser) {
    const auditAction = `expiry_notice:${agg.soonest.toISOString().slice(0, 10)}`;
    const already = await prisma.auditLog.findFirst({
      where: { actorId: "system", action: auditAction, targetId: userId },
    });
    if (already) continue;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: `Heads up — ${agg.points.toLocaleString()} points expiring soon`,
        text: `Your ${agg.points.toLocaleString()} points expire on ${agg.soonest
          .toISOString()
          .slice(0, 10)}. Spend them at /rewards before the deadline.`,
      });
    }
    await prisma.auditLog.create({
      data: {
        actorId: "system",
        action: auditAction,
        targetId: userId,
        payload: { points: agg.points, expiresAt: agg.soonest.toISOString() },
      },
    });
    summary.expiryWarnings++;
  }

  return NextResponse.json({ ok: true, ...summary });
}

export const GET = run;
export const POST = run;
