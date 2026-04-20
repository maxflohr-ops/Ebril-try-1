import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tiers = [
    { name: "Fan", sortOrder: 1, thresholdCentsPerMonth: 100, multiplier: 1.0 },
    { name: "Superfan", sortOrder: 2, thresholdCentsPerMonth: 1500, multiplier: 1.25 },
    { name: "VIP", sortOrder: 3, thresholdCentsPerMonth: 5000, multiplier: 1.5 },
  ];
  for (const t of tiers) {
    await prisma.tier.upsert({ where: { name: t.name }, update: t, create: t });
  }

  const packs = [
    { name: "Starter", points: 1000, priceCents: 1000, sortOrder: 1 },
    { name: "Boost", points: 5500, priceCents: 5000, sortOrder: 2 },
    { name: "Mega", points: 12000, priceCents: 10000, sortOrder: 3 },
  ];
  for (const p of packs) {
    const existing = await prisma.pointPack.findFirst({ where: { name: p.name } });
    if (existing) await prisma.pointPack.update({ where: { id: existing.id }, data: p });
    else await prisma.pointPack.create({ data: p });
  }

  // Real external links for Ebril — sourced from the Universal Music Canada
  // press release + verified public accounts. Update freely as new platforms /
  // campaigns launch.
  const links = [
    {
      kind: "spotify_artist" as const,
      label: "spotify",
      url: "https://ebril.lnk.to/incopula",
      sortOrder: 1,
    },
    {
      kind: "spotify_featured" as const,
      label: "stranger in you",
      url: "https://ebril.lnk.to/strangerinyou",
      sortOrder: 2,
    },
    {
      kind: "youtube_channel" as const,
      label: "youtube",
      url: "https://www.youtube.com/channel/UC_U01UV1HYIkkXM8cKP3Grg",
      sortOrder: 3,
    },
    {
      kind: "shopify_store" as const,
      label: "merch",
      url: "https://shop.umusic.ca/",
      sortOrder: 4,
    },
    {
      kind: "instagram" as const,
      label: "instagram",
      url: "https://www.instagram.com/ehugiii/",
      sortOrder: 5,
    },
    {
      kind: "tiktok" as const,
      label: "tiktok",
      url: "https://www.tiktok.com/@ebbionline",
      sortOrder: 6,
    },
    {
      kind: "website" as const,
      label: "ebril.net",
      url: "https://www.ebril.net/",
      sortOrder: 7,
    },
  ];
  for (const l of links) {
    const existing = await prisma.externalLink.findFirst({
      where: { kind: l.kind, url: l.url },
    });
    if (existing) {
      await prisma.externalLink.update({ where: { id: existing.id }, data: l });
    } else {
      await prisma.externalLink.create({ data: l });
    }
  }

  console.log("Seeded tiers, point packs, and external links.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
