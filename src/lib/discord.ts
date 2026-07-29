import crypto from "node:crypto";

/**
 * Discord OAuth 2.0 helpers.
 *
 * Required env:
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *
 * Register a Discord application at https://discord.com/developers/applications,
 * add a redirect URI of `${APP_BASE_URL}/api/auth/discord/callback`, and
 * enable the `identify` scope (we only need their user id + username).
 * Add `email` if you ever want to surface their Discord email.
 */

const AUTH_URL = "https://discord.com/oauth2/authorize";
const TOKEN_URL = "https://discord.com/api/oauth2/token";
const USER_URL = "https://discord.com/api/users/@me";

function clientId() {
  const v = process.env.DISCORD_CLIENT_ID;
  if (!v) throw new Error("DISCORD_CLIENT_ID not set");
  return v;
}
function clientSecret() {
  const v = process.env.DISCORD_CLIENT_SECRET;
  if (!v) throw new Error("DISCORD_CLIENT_SECRET not set");
  return v;
}
function redirectUri() {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL not set");
  return `${base.replace(/\/$/, "")}/api/auth/discord/callback`;
}

export function isConfigured(): boolean {
  return (
    !!process.env.DISCORD_CLIENT_ID &&
    !!process.env.DISCORD_CLIENT_SECRET &&
    !!process.env.APP_BASE_URL
  );
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: "identify",
    state,
    prompt: "none",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export function randomState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export interface DiscordTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeCode(code: string): Promise<DiscordTokens> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`discord token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export interface DiscordIdentity {
  id: string;
  username: string;
  globalName: string | null;
  avatarHash: string | null;
}

export async function fetchIdentity(accessToken: string): Promise<DiscordIdentity> {
  const res = await fetch(USER_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`discord identity fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };
  return {
    id: json.id,
    username: json.username,
    globalName: json.global_name,
    avatarHash: json.avatar,
  };
}

export function avatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  // .gif if animated, .png otherwise. Discord prefixes animated hashes with "a_".
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=128`;
}
