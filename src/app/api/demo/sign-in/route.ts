import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isDemoMode, DEMO_PATREON_IDS } from "@/lib/demo";

export async function GET(req: NextRequest) {
  // Hard fail-closed: demo sign-in is only allowed when DEMO_MODE is on.
  // Without this check, this endpoint would be an authentication bypass.
  if (!isDemoMode()) {
    return NextResponse.json({ error: "demo_disabled" }, { status: 404 });
  }

  const patreonId = req.nextUrl.searchParams.get("as");
  if (!patreonId || !DEMO_PATREON_IDS.includes(patreonId as never)) {
    return NextResponse.json({ error: "invalid_demo_user" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { patreonUserId: patreonId },
    select: { id: true, onboardedAt: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "not_seeded", hint: "run npx tsx prisma/seed-demo.ts" },
      { status: 404 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  // skip onboarding for demo — most demo flows want to land on home.
  if (!user.onboardedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardedAt: new Date() },
    });
  }
  await session.save();

  return NextResponse.redirect(new URL("/", req.url));
}
