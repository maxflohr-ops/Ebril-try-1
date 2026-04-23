import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

// Minecraft server → copula API auth. The server plugin computes an HMAC-
// SHA256 over the raw request body using the shared secret and sends it
// in `X-Copula-Signature`. We verify with a timing-safe compare.
//
// The spec is documented in docs/minecraft-integration.md so plugin authors
// have the exact bytes to sign.

export function minecraftSharedSecret(): string | null {
  return process.env.MINECRAFT_SHARED_SECRET ?? null;
}

export function signPayload(raw: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

export function verifyPayload(raw: string, signature: string | null, secret: string): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = signPayload(raw, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/** Standardized 401/403 responses for the server APIs. */
export function unauthorized(reason: "missing_secret" | "bad_signature") {
  const status = reason === "missing_secret" ? 503 : 401;
  return NextResponse.json({ error: reason }, { status });
}

/**
 * Reads the raw body, verifies the signature, and returns the parsed JSON
 * payload. Call once per route handler.
 */
export async function readSignedRequest<T>(
  req: NextRequest
): Promise<{ ok: true; body: T } | { ok: false; res: NextResponse }> {
  const secret = minecraftSharedSecret();
  if (!secret) {
    return { ok: false, res: unauthorized("missing_secret") };
  }
  const raw = await req.text();
  const sig = req.headers.get("x-copula-signature");
  if (!verifyPayload(raw, sig, secret)) {
    return { ok: false, res: unauthorized("bad_signature") };
  }
  try {
    return { ok: true, body: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ error: "invalid_json" }, { status: 400 }),
    };
  }
}

/**
 * Human-readable, easy-to-type-in-chat pairing code. 6 chars, no ambiguous
 * ones (I/O/0/1/L), formatted as XXX-XXX.
 */
export function newLinkCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    const idx = crypto.randomInt(0, chars.length);
    out += chars[idx];
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

/** A UUID in any format Mojang might send us → canonical lower-case dashed. */
export function normalizeMcUuid(raw: string): string | null {
  const hex = raw.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
