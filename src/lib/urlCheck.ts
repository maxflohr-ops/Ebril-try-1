// Lightweight liveness check for fan-submitted clip URLs.
// Works in the happy case (200/3xx). Social platforms often return 403 to
// server-side requests even when the post is live, so we classify 403 as
// "unknown" rather than "unreachable" and let the admin visually confirm.

import { guardOutboundUrl } from "./netGuard";

export interface UrlCheckResult {
  status: "ok" | "unreachable" | "unknown";
  statusCode: number | null;
}

export async function checkUrlLiveness(url: string): Promise<UrlCheckResult> {
  // SSRF guard: reject private/loopback/metadata addresses before any fetch.
  // Fan-submitted URLs would otherwise let a signed-in user probe internal
  // services from the serverless runtime.
  const guard = await guardOutboundUrl(url);
  if (!guard.ok) return { status: "unreachable", statusCode: null };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);

    // HEAD first — cheapest; some CDNs 405 on HEAD so fall back to GET on that.
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; copula-linkcheck/1.0; +https://copula.ebril.com)",
      },
    }).catch(() => null);

    if (!res || res.status === 405) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; copula-linkcheck/1.0; +https://copula.ebril.com)",
        },
      }).catch(() => null);
    }
    clearTimeout(timeout);

    if (!res) return { status: "unreachable", statusCode: null };
    if (res.ok) return { status: "ok", statusCode: res.status };
    if (res.status === 403 || res.status === 429) {
      // platform blocked the bot; post is likely live.
      return { status: "unknown", statusCode: res.status };
    }
    return { status: "unreachable", statusCode: res.status };
  } catch {
    return { status: "unreachable", statusCode: null };
  }
}
