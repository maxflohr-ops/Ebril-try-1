import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { getBalance, defaultExpiry } from "@/lib/points";
import { sendPushToUser } from "@/lib/push";

const Schema = z.object({
  userId: z.string().uuid(),
  delta: z
    .number()
    .int()
    .refine((v) => v !== 0 && v >= -1_000_000 && v <= 1_000_000, {
      message: "delta must be non-zero within ±1,000,000",
    }),
  reason: z.string().min(3).max(200),
  expires: z.boolean().default(false),
  notify: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { userId, delta, reason, expires, notify } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  // For debits, make sure we don't overdraw — debits against a zero balance
  // usually mean a typo.
  if (delta < 0) {
    const balance = await getBalance(userId);
    if (balance + delta < 0) {
      return NextResponse.json(
        { error: "would_overdraw", balance },
        { status: 400 }
      );
    }
  }

  const refId = `adjust:${admin.userId}:${Date.now()}`;
  const txRow = await prisma.pointTransaction.create({
    data: {
      userId,
      delta,
      reason: "manual_adjust",
      refId,
      expiresAt: delta > 0 && expires ? defaultExpiry() : null,
    },
  });

  await logAudit(admin.userId, "points.manual_adjust", userId, {
    delta,
    reason,
    txId: txRow.id,
  });

  if (notify) {
    const title =
      delta > 0
        ? `+${delta.toLocaleString()} points, on the house`
        : `${delta.toLocaleString()} points adjusted`;
    const body = reason;
    await sendPushToUser(userId, { title, body, url: "/" });
  }

  return NextResponse.json({
    tx: txRow,
    newBalance: await getBalance(userId),
  });
}
