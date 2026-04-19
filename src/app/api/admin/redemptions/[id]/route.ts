import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const PatchSchema = z.object({
  status: z.enum(["approved", "shipped", "delivered", "cancelled"]),
  fulfillmentNotes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { status, fulfillmentNotes } = parsed.data;

  const redemption = await prisma.$transaction(async (tx) => {
    const r = await tx.redemption.findUnique({
      where: { id: params.id },
      include: { reward: true, user: true },
    });
    if (!r) throw new Error("not_found");

    if (status === "cancelled" && r.status !== "cancelled") {
      const existingReversal = await tx.pointTransaction.findFirst({
        where: { userId: r.userId, refId: r.id, reason: "manual_adjust", delta: { gt: 0 } },
      });
      if (!existingReversal) {
        await tx.pointTransaction.create({
          data: {
            userId: r.userId,
            delta: r.costPoints,
            reason: "manual_adjust",
            refId: r.id,
            expiresAt: null,
          },
        });
      }
      if (r.reward.stock !== null) {
        await tx.reward.update({
          where: { id: r.rewardId },
          data: { stock: { increment: 1 } },
        });
      }
    }

    return tx.redemption.update({
      where: { id: r.id },
      data: {
        status,
        fulfillmentNotes: fulfillmentNotes ?? r.fulfillmentNotes,
      },
      include: { reward: true, user: true },
    });
  });

  await logAudit(admin.userId, `redemption.${status}`, redemption.id, { fulfillmentNotes });

  if (redemption.user.email) {
    const subject =
      status === "shipped"
        ? `Your ${redemption.reward.name} is on the way`
        : status === "cancelled"
          ? `Redemption cancelled — points returned`
          : `Redemption update: ${redemption.reward.name}`;
    await sendEmail({
      to: redemption.user.email,
      subject,
      text:
        status === "cancelled"
          ? `We had to cancel your redemption for ${redemption.reward.name}. Your ${redemption.costPoints} points have been credited back.`
          : `Status: ${status}.${fulfillmentNotes ? `\n\nNotes: ${fulfillmentNotes}` : ""}`,
    });
  }

  return NextResponse.json({ redemption });
}
