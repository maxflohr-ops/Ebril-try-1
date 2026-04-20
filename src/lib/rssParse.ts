// Minimal RSS / Atom parser for moodboard feeds. No XML lib — we only need a
// handful of fields and want to stay zero-dep. Good enough for Pinterest's
// public board RSS, Tumblr, Are.na channels, and other creator moodboards.

export interface FeedItem {
  title: string | null;
  link: string | null;
  image: string | null;
  guid: string | null;
  description: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function pickTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  return decodeEntities(stripCdata(m[1])).trim();
}

function pickImage(block: string): string | null {
  // Common places an image hides in a feed: <media:thumbnail url="…"/>,
  // <media:content url="…"/>, <enclosure url="…"/>, <img src="…"> in the body.
  const medThumb = block.match(/<media:thumbnail\b[^>]*url="([^"]+)"/i);
  if (medThumb) return medThumb[1];
  const medContent = block.match(/<media:content\b[^>]*url="([^"]+)"/i);
  if (medContent) return medContent[1];
  const enc = block.match(/<enclosure\b[^>]*url="([^"]+)"/i);
  if (enc) return enc[1];
  const desc = pickTag(block, "description") ?? pickTag(block, "content:encoded");
  if (desc) {
    const img = desc.match(/<img[^>]+src="([^"]+)"/i);
    if (img) return img[1];
  }
  return null;
}

import { guardOutboundUrl } from "./netGuard";

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  // SSRF guard: admin feed URLs go through an outbound fetch; lock out
  // private/loopback/metadata IPs.
  const guard = await guardOutboundUrl(url);
  if (!guard.ok) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "user-agent":
          "Mozilla/5.0 (compatible; copula-feedsync/1.0; +https://copula.ebril.com)",
      },
      // small cache so repeated admin reloads don't hammer pinterest
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const text = await res.text();

    // RSS <item> first; fall back to Atom <entry>.
    const itemBlocks = text.match(/<item\b[\s\S]*?<\/item>/gi);
    const entryBlocks = text.match(/<entry\b[\s\S]*?<\/entry>/gi);
    const blocks = itemBlocks?.length ? itemBlocks : entryBlocks ?? [];

    return blocks.map((block) => {
      const title = pickTag(block, "title");
      const descriptionRaw =
        pickTag(block, "description") ?? pickTag(block, "summary") ?? null;
      const description = descriptionRaw
        ? descriptionRaw.replace(/<[^>]+>/g, "").trim()
        : null;
      const guid = pickTag(block, "guid") ?? pickTag(block, "id");

      // link can be a bare element or an atom-style self-closing tag
      const link =
        pickTag(block, "link") ??
        block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ??
        null;

      return {
        title,
        link,
        image: pickImage(block),
        guid,
        description,
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
