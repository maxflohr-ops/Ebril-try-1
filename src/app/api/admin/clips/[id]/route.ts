import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { prisma } from "@/lib/db";
import { moveClipStatus, maybeGrantFeaturedCollectible } from "@/lib/clips";

const Schema = z.object({
  status: z.enum(["pending", "approved", "featured", "viral", "rejected"]).optional(),
  adminNotes: z.string().max(2000).nullable().optional(),
  rejectedReason: z.string().max(800).nullable().optional(),
  viewCount: z.number().int().min(0).optional(),
});

function subjectFor(status: string): string {
  switch (status) {
    case "approved":
      return "i saw your clip — thank you";
    case "featured":
      return "i kept your clip close";
    case "viral":
      return "your clip is carrying the song";
    case "rejected":
      return "a note about your clip";
    default:
      return "about your clip";
  }
}

function bodyFor(status: string, points: number, reason?: string | null): string {
  switch (status) {
    case "approved":
      return `i saw it. it stays with us. +${points} points.`;
    case "featured":
      return `yours is up on the wall now. +${points} points in total.`;
    case "viral":
      return `this one is carrying the song further than i could. +${points} points in total.`;
    case "rejected":
      return reason
        ? `couldn't keep this one, here's why: ${reason}. try another take whenever you're ready.`
        : `couldn't keep this one — try another take whenever you're ready.`;
    default:
      return `status: ${status}.`;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (parsed.data.viewCount !== undefined) {
    await prisma.clip.update({
      where: { id: params.id },
      data: {
        viewCount: parsed.data.viewCount,
        viewCountUpdatedAt: new Date(),
      },
    });
  }

  if (!parsed.data.status) {
    const clip = await prisma.clip.findUnique({ where: { id: params.id } });
    return NextResponse.json({ clip });
  }

  const moved = await moveClipStatus(
    params.id,
    parsed.data.status,
    admin.userId,
    parsed.data.adminNotes ?? null,
    parsed.data.rejectedReason ?? null
  );

  await logAudit(admin.userId, `clip.${moved.status}`, moved.id, {
    previous: moved.previousStatus,
    delta: moved.pointsDelta,
    total: moved.totalAwarded,
  });

  if (moved.status === "featured" || moved.status === "viral") {
    await maybeGrantFeaturedCollectible(moved.id);
  }

  const fan = await prisma.user.findUnique({
    where: { id: moved.userId },
    select: { email: true },
  });
  const subject = subjectFor(moved.status);
  const body = bodyFor(moved.status, moved.totalAwarded, parsed.data.rejectedReason);
  if (fan?.email) {
    await sendEmail({ to: fan.email, subject, text: body });
  }
  await sendPushToUser(moved.userId, {
    title: subject,
    body,
    url: "/my-clips",
  });

  return NextResponse.json({ clip: moved });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.clip.delete({ where: { id: params.id } });
  await logAudit(admin.userId, "clip.delete", params.id);
  return NextResponse.json({ ok: true });
}
