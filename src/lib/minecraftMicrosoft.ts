import crypto from "node:crypto";

/**
 * Microsoft → Xbox Live → XSTS → Mojang → Minecraft profile.
 *
 * This is the same auth chain the official Minecraft Launcher uses to
 * sign a player in. The end state is a verified `{ uuid, username }`
 * pair we can write into MinecraftAccount without the fan typing a
 * pairing code in-game.
 *
 * Reference: https://wiki.vg/Microsoft_Authentication_Scheme (community
 * doc; matches what the launcher actually does).
 *
 * Required env:
 *   AZURE_CLIENT_ID     — Azure app registration "Application (client) ID"
 *   AZURE_CLIENT_SECRET — Client secret value from the same registration
 *
 * The registration must be for *personal Microsoft accounts only* (or
 * "Accounts in any organizational directory and personal Microsoft
 * accounts"), with redirect URI
 *   https://<APP_BASE_URL>/api/auth/minecraft-ms/callback
 * and these delegated permissions: `XboxLive.signin`, `offline_access`.
 */

const MS_AUTHORIZE_URL =
  "https://login.live.com/oauth20_authorize.srf";
const MS_TOKEN_URL = "https://login.live.com/oauth20_token.srf";
const XBL_AUTH_URL = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_AUTH_URL = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN_URL =
  "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL = "https://api.minecraftservices.com/minecraft/profile";

function clientId() {
  const v = process.env.AZURE_CLIENT_ID;
  if (!v) throw new Error("AZURE_CLIENT_ID not set");
  return v;
}

function clientSecret() {
  const v = process.env.AZURE_CLIENT_SECRET;
  if (!v) throw new Error("AZURE_CLIENT_SECRET not set");
  return v;
}

function redirectUri() {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL not set");
  return `${base.replace(/\/$/, "")}/api/auth/minecraft-ms/callback`;
}

export function isConfigured(): boolean {
  return (
    !!process.env.AZURE_CLIENT_ID &&
    !!process.env.AZURE_CLIENT_SECRET &&
    !!process.env.APP_BASE_URL
  );
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: "XboxLive.signin offline_access",
    state,
  });
  return `${MS_AUTHORIZE_URL}?${params.toString()}`;
}

export function randomState(): string {
  return crypto.randomBytes(24).toString("hex");
}

interface MsTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCode(code: string): Promise<MsTokens> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
  });
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`microsoft token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

interface XblResponse {
  Token: string;
  DisplayClaims: { xui: { uhs: string }[] };
}

async function xblAuth(msAccessToken: string): Promise<XblResponse> {
  const res = await fetch(XBL_AUTH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${msAccessToken}`,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
  });
  if (!res.ok) {
    throw new Error(`xbox live auth failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

interface XstsResponse {
  Token: string;
  DisplayClaims: { xui: { uhs: string }[] };
}

export class XboxRequirementError extends Error {
  constructor(public xerr: string) {
    super(`xbox prerequisite failed: ${xerr}`);
  }
}

async function xstsAuth(xblToken: string): Promise<XstsResponse> {
  const res = await fetch(XSTS_AUTH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [xblToken],
      },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
    }),
  });
  if (res.status === 401) {
    // XErr codes documented at wiki.vg:
    //   2148916233 — no Xbox account associated
    //   2148916235 — country bans Xbox Live
    //   2148916236/8 — adult verification required
    //   2148916237 — age verification required (south korea)
    //   2148916238 — child account, requires family setup
    const body = await res.text();
    const m = body.match(/"XErr"\s*:\s*(\d+)/);
    throw new XboxRequirementError(m ? m[1] : "401");
  }
  if (!res.ok) {
    throw new Error(`xsts auth failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function minecraftLogin(uhs: string, xstsToken: string): Promise<string> {
  const res = await fetch(MC_LOGIN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${uhs};${xstsToken}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`minecraft login failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export interface MinecraftProfile {
  id: string; // 32-char no-dashes UUID
  name: string;
}

async function fetchProfile(mcAccessToken: string): Promise<MinecraftProfile | null> {
  const res = await fetch(MC_PROFILE_URL, {
    headers: { authorization: `Bearer ${mcAccessToken}` },
  });
  if (res.status === 404) return null; // signed-in MS account that doesn't own Java
  if (!res.ok) {
    throw new Error(`minecraft profile fetch failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string; name: string };
  return { id: json.id, name: json.name };
}

/**
 * End-to-end: take a Microsoft authorization code and return the
 * signed-in player's `{ uuid, username }`, or null if they don't own
 * Minecraft Java.
 *
 * Throws XboxRequirementError if the player can't pass Xbox Live (no
 * Xbox account, region ban, child account, etc.). Caller should surface
 * a friendly explanation rather than dumping a 401.
 */
export async function authorizeAndFetchProfile(
  code: string
): Promise<MinecraftProfile | null> {
  const msTokens = await exchangeCode(code);
  const xbl = await xblAuth(msTokens.access_token);
  const xsts = await xstsAuth(xbl.Token);
  const uhs = xsts.DisplayClaims.xui[0]?.uhs ?? xbl.DisplayClaims.xui[0]?.uhs;
  if (!uhs) throw new Error("missing user hash from xbox live response");
  const mcToken = await minecraftLogin(uhs, xsts.Token);
  return fetchProfile(mcToken);
}
