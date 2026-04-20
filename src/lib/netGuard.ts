import dns from "node:dns/promises";
import net from "node:net";

const DENIED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

// IPv4 CIDR guards (loopback, private, link-local, cgnat, metadata, multicast, reserved).
function isBlockedIPv4(addr: string): boolean {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;                       // 10.0.0.0/8
  if (a === 127) return true;                      // loopback
  if (a === 169 && b === 254) return true;         // link-local + AWS/GCP IMDS
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true;         // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 0) return true;                        // 0.0.0.0/8
  if (a >= 224) return true;                       // multicast + reserved 224-255
  return false;
}

function isBlockedIPv6(addr: string): boolean {
  const v = addr.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("fc") || v.startsWith("fd")) return true;   // unique-local
  if (v.startsWith("fe80")) return true;                        // link-local
  if (v.startsWith("ff")) return true;                          // multicast
  if (v.startsWith("::ffff:")) {
    // IPv4-mapped — extract and re-check as v4
    const v4 = v.slice(7);
    return isBlockedIPv4(v4);
  }
  return false;
}

export interface GuardResult {
  ok: boolean;
  reason?:
    | "scheme"
    | "hostname"
    | "denied_host"
    | "blocked_ip"
    | "dns_failed";
  resolved?: string[];
}

export async function guardOutboundUrl(raw: string): Promise<GuardResult> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "hostname" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "scheme" };
  }
  const host = parsed.hostname;
  if (!host) return { ok: false, reason: "hostname" };
  if (DENIED_HOSTS.has(host.toLowerCase())) return { ok: false, reason: "denied_host" };

  // If the hostname is already a literal IP, check it directly and skip DNS.
  if (net.isIP(host)) {
    const blocked =
      net.isIP(host) === 4 ? isBlockedIPv4(host) : isBlockedIPv6(host);
    return blocked ? { ok: false, reason: "blocked_ip", resolved: [host] } : { ok: true, resolved: [host] };
  }

  let addrs: string[];
  try {
    const resolved = await dns.lookup(host, { all: true, verbatim: true });
    addrs = resolved.map((r) => r.address);
  } catch {
    return { ok: false, reason: "dns_failed" };
  }
  if (addrs.length === 0) return { ok: false, reason: "dns_failed" };
  for (const addr of addrs) {
    const family = net.isIP(addr);
    const blocked =
      family === 4 ? isBlockedIPv4(addr) : family === 6 ? isBlockedIPv6(addr) : true;
    if (blocked) return { ok: false, reason: "blocked_ip", resolved: addrs };
  }
  return { ok: true, resolved: addrs };
}
