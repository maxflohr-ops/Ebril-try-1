import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authorizeUrl, isConfigured, randomState } from "@/lib/discord";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.redirect(
      new URL("/", process.env.APP_BASE_URL ?? "http://localhost:3000")
    );
  }
  if (!isConfigured()) {
    return NextResponse.json({ error: "discord_oauth_not_configured" }, { status: 503 });
  }
  const state = randomState();
  session.discordOauthState = state;
  await session.save();
  return NextResponse.redirect(authorizeUrl(state));
}
