import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isDemoMode } from "@/lib/demo";

export async function GET(req: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "demo_disabled" }, { status: 404 });
  }
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/demo", req.url));
}
