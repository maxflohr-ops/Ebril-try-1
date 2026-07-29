import crypto from "node:crypto";

// Envelope format for encrypted blobs:
//   v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
// The "v1" prefix lets us rotate keys / algorithms later without forcing a
// full data migration — older envelopes stay readable while new writes use
// the newest version.
const VERSION = "v1" as const;
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function loadKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Accept either a 64-char hex string or a 44-char base64 string. Both
  // encode 32 bytes.
  let buf: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    buf = Buffer.from(raw, "hex");
  } else {
    try {
      buf = Buffer.from(raw, "base64");
    } catch {
      return null;
    }
  }
  return buf.length === KEY_BYTES ? buf : null;
}

/**
 * Encrypts a plaintext string. When ENCRYPTION_KEY is unset (dev only), the
 * plaintext passes through so the rest of the system still works — any
 * plaintext value will round-trip cleanly through decryptMaybe, which knows
 * how to recognize our envelope format.
 */
export function encryptMaybe(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const key = loadKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

/**
 * Decrypts a value written by encryptMaybe. Accepts plaintext fall-through
 * too — any value that doesn't start with our envelope prefix is assumed to
 * be a legacy plaintext row (e.g. written before encryption was introduced)
 * and returned unchanged.
 */
export function decryptMaybe(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(`${VERSION}:`)) return stored;
  const key = loadKey();
  if (!key) {
    // Encrypted value with no key = broken; fail closed so callers can log
    // or force a re-auth rather than silently leaking tokens.
    return null;
  }
  const parts = stored.split(":");
  if (parts.length !== 4) return null;
  try {
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const ct = Buffer.from(parts[3], "hex");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}

/** For ops scripts: does the current environment have encryption turned on? */
export function isEncryptionConfigured(): boolean {
  return loadKey() !== null;
}
