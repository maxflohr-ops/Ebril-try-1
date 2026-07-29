import { prisma } from "./db";
import { fetchFeed } from "./rssParse";

export interface SyncResult {
  briefId: string;
  added: number;
  skipped: number;
  feedUrl: string;
}

function stableId(item: {
  guid: string | null;
  link: string | null;
  image: string | null;
}): string | null {
  return item.guid ?? item.link ?? item.image;
}

export async function syncDirectionFeed(briefId: string): Promise<SyncResult | null> {
  const brief = await prisma.clippingBrief.findUnique({
    where: { id: briefId },
    select: { id: true, inspirationFeedUrl: true },
  });
  if (!brief?.inspirationFeedUrl) return null;

  const items = await fetchFeed(brief.inspirationFeedUrl);
  let added = 0;
  let skipped = 0;

  // current max sortOrder so new items append
  const maxRow = await prisma.inspirationImage.findFirst({
    where: { briefId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let cursor = (maxRow?.sortOrder ?? 0) + 1;

  for (const item of items) {
    const id = stableId(item);
    const image = item.image;
    if (!id || !image) {
      skipped++;
      continue;
    }
    // dedupe via the compound unique on (briefId, externalId)
    try {
      await prisma.inspirationImage.create({
        data: {
          briefId,
          externalId: id,
          url: image,
          pinUrl: item.link ?? null,
          caption: item.title ?? null,
          attribution: item.description ?? null,
          source: "feed",
          sortOrder: cursor,
        },
      });
      cursor++;
      added++;
    } catch {
      // unique conflict → already have this pin; skip quietly.
      skipped++;
    }
  }

  await prisma.clippingBrief.update({
    where: { id: briefId },
    data: { inspirationFeedSyncedAt: new Date() },
  });

  return { briefId, added, skipped, feedUrl: brief.inspirationFeedUrl };
}
