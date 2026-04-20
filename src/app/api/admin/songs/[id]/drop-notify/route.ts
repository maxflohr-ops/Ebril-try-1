import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { notifySubscribersForSong } from "@/lib/dropNotify";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const result = await notifySubscribersForSong(params.id);
    await logAudit(admin.userId, "song.drop_notify", params.id, result);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: msg === "not_found" ? 404 : 500 });
  }
}
