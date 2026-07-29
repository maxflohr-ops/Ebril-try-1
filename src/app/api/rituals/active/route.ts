import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { activeRitualForUser } from "@/lib/rituals";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ritual = await activeRitualForUser(session.userId);
  return NextResponse.json({ ritual });
}
