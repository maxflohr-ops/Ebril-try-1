import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { syncDirectionFeed } from "@/lib/inspirationSync";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const result = await syncDirectionFeed(params.id);
  if (!result)
    return NextResponse.json({ error: "no_feed_configured" }, { status: 400 });
  await logAudit(admin.userId, "direction.sync_feed", params.id, result);
  return NextResponse.json({ ok: true, ...result });
}
