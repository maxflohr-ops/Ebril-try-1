import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/patreon";
import { prisma } from "@/lib/db";
import { credit } from "@/lib/points";
import { recalcUserTier } from "@/lib/tiers";

export const runtime = "nodejs";

function activeCampaignMultiplier(now: Date): Promise<number> {
  return prisma.campaign
    .findMany({ where: { startsAt: { lte: now }, endsAt: { gte: now } } })
    .then((cs) => cs.reduce((acc, c) => acc * c.multiplier, 1));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-patreon-signature");
  const trigger = req.headers.get("x-patreon-event");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw);
  const externalId = `${trigger ?? "unknown"}:${payload.data?.id ?? crypto.randomUUID()}:${
    payload.data?.attributes?.last_charge_date ?? Date.now()
  }`;

  try {
    await prisma.webhookEvent.create({
      data: { source: "patreon", externalId, payload },
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const member = payload.data;
  const patreonUserId: string | undefined = (payload.included ?? []).find(
    (r: { type: string }) => r.type === "user"
  )?.id;
  if (!patreonUserId) return NextResponse.json({ ok: true, skipped: "no_user" });

  const user = await prisma.user.findUnique({ where: { patreonUserId } });
  if (!user) return NextResponse.json({ ok: true, skipped: "unknown_user" });

  const amountCents: number = member?.attributes?.currently_entitled_amount_cents ?? 0;
  const patronStatus: string | null = member?.attributes?.patron_status ?? null;
  const lastChargeStatus: string | null = member?.attributes?.last_charge_status ?? null;
  const lastChargeDate: string | null = member?.attributes?.last_charge_date ?? null;

  const status =
    patronStatus === "active_patron"
      ? "active"
      : patronStatus === "declined_patron"
        ? "declined"
        : patronStatus === "former_patron"
          ? "cancelled"
          : "paused";

  await prisma.pledge.upsert({
    where: { patreonPledgeId: member.id },
    update: {
      amountCents,
      status,
      lastChargedAt: lastChargeDate ? new Date(lastChargeDate) : null,
    },
    create: {
      userId: user.id,
      patreonPledgeId: member.id,
      amountCents,
      currency: "USD",
      status,
      startedAt: lastChargeDate ? new Date(lastChargeDate) : new Date(),
      lastChargedAt: lastChargeDate ? new Date(lastChargeDate) : null,
    },
  });

  if (
    trigger &&
    trigger.includes("pledge") &&
    lastChargeStatus === "Paid" &&
    amountCents > 0 &&
    lastChargeDate
  ) {
    const refId = `charge:${member.id}:${lastChargeDate}`;
    const existing = await prisma.pointTransaction.findFirst({
      where: { userId: user.id, refId },
    });
    if (!existing) {
      const multiplier = await activeCampaignMultiplier(new Date());
      await credit({
        userId: user.id,
        amountCents,
        reason: "pledge_charge",
        refId,
        multiplier,
      });
    }
  }

  await recalcUserTier(user.id);
  return NextResponse.json({ ok: true });
}
