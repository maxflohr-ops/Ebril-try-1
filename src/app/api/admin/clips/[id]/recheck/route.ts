import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { checkUrlLiveness } from "@/lib/urlCheck";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const clip = await prisma.clip.findUnique({
    where: { id: params.id },
    select: { url: true },
  });
  if (!clip) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const check = await checkUrlLiveness(clip.url);
  const updated = await prisma.clip.update({
    where: { id: params.id },
    data: {
      urlStatus: check.status,
      urlStatusCode: check.statusCode,
      urlCheckedAt: new Date(),
    },
  });
  return NextResponse.json({
    clip: updated,
    check,
  });
}
