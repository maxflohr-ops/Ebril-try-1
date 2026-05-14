import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authorizeUrl, isConfigured, randomState } from "@/lib/minecraftMicrosoft";

/**
 * Kicks off the Microsoft sign-in chain so the fan can auto-link their
 * Minecraft account. Requires an active copula session — we use the
 * userId at callback time to upsert the MinecraftAccount row.
 */
export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.redirect(
      new URL("/", process.env.APP_BASE_URL ?? "http://localhost:3000")
    );
  }
  if (!isConfigured()) {
    return NextResponse.json({ error: "microsoft_oauth_not_configured" }, { status: 503 });
  }
  const state = randomState();
  session.msOauthState = state;
  await session.save();
  return NextResponse.redirect(authorizeUrl(state));
}
