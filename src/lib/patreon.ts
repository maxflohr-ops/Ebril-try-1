import crypto from "node:crypto";

const PATREON_OAUTH_BASE = "https://www.patreon.com/oauth2";
const PATREON_API_BASE = "https://www.patreon.com/api/oauth2/v2";

export const PATREON_SCOPES = [
  "identity",
  "identity[email]",
  "campaigns",
  "campaigns.members",
  "campaigns.members[email]",
].join(" ");

export interface PatreonTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface PatreonIdentity {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

function clientId() {
  const id = process.env.PATREON_CLIENT_ID;
  if (!id) throw new Error("PATREON_CLIENT_ID not set");
  return id;
}

function clientSecret() {
  const secret = process.env.PATREON_CLIENT_SECRET;
  if (!secret) throw new Error("PATREON_CLIENT_SECRET not set");
  return secret;
}

function redirectUri() {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL not set");
  return `${base.replace(/\/$/, "")}/api/auth/patreon/callback`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: PATREON_SCOPES,
    state,
  });
  return `${PATREON_OAUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<PatreonTokens> {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
  });
  const res = await fetch(`${PATREON_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Patreon token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refreshTokens(refreshToken: string): Promise<PatreonTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
  });
  const res = await fetch(`${PATREON_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Patreon refresh failed: ${res.status}`);
  return res.json();
}

export async function fetchIdentity(accessToken: string): Promise<PatreonIdentity> {
  const url = new URL(`${PATREON_API_BASE}/identity`);
  url.searchParams.set("fields[user]", "email,full_name,image_url");
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Patreon identity failed: ${res.status}`);
  const json = await res.json();
  const data = json.data;
  return {
    id: data.id,
    email: data.attributes?.email ?? null,
    fullName: data.attributes?.full_name ?? null,
    avatarUrl: data.attributes?.image_url ?? null,
  };
}

export interface PatreonMembership {
  membershipId: string;
  currentlyEntitledAmountCents: number;
  lastChargeStatus: string | null;
  lastChargeDate: string | null;
  patronStatus: string | null;
}

export async function fetchCurrentMembership(
  accessToken: string
): Promise<PatreonMembership | null> {
  const url = new URL(`${PATREON_API_BASE}/identity`);
  url.searchParams.set("include", "memberships");
  url.searchParams.set(
    "fields[member]",
    "currently_entitled_amount_cents,last_charge_status,last_charge_date,patron_status"
  );
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Patreon membership fetch failed: ${res.status}`);
  const json = await res.json();
  const member = (json.included ?? []).find((r: { type: string }) => r.type === "member");
  if (!member) return null;
  return {
    membershipId: member.id,
    currentlyEntitledAmountCents: member.attributes?.currently_entitled_amount_cents ?? 0,
    lastChargeStatus: member.attributes?.last_charge_status ?? null,
    lastChargeDate: member.attributes?.last_charge_date ?? null,
    patronStatus: member.attributes?.patron_status ?? null,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PATREON_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("md5", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function randomState(): string {
  return crypto.randomBytes(24).toString("hex");
}
