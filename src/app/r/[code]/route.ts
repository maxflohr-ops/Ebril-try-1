import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const session = await getSession();
  session.pendingReferralCode = params.code;
  await session.save();
  return NextResponse.redirect(new URL("/api/auth/patreon", _req.url));
}
