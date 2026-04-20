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

  const collectibles = [
    {
      key: "welcome_in",
      name: "welcome in",
      flavor: "the first cassette. for saying yes.",
      tapeColor: "#D89B7A",
      labelColor: "#F4ECE2",
      rarity: "common" as const,
      sortOrder: 1,
    },
    {
      key: "first_pledge",
      name: "the first month",
      flavor: "you stayed for a whole month. thank you.",
      tapeColor: "#C97064",
      labelColor: "#F4ECE2",
      rarity: "common" as const,
      sortOrder: 2,
    },
    {
      key: "first_redeem",
      name: "in your hands",
      flavor: "you took the first thing. it felt good.",
      tapeColor: "#8BA888",
      labelColor: "#15100E",
      rarity: "common" as const,
      sortOrder: 3,
    },
    {
      key: "first_ritual",
      name: "the first ritual",
      flavor: "you pressed play when i asked. hi.",
      tapeColor: "#6B4A5E",
      labelColor: "#F4ECE2",
      rarity: "rare" as const,
      sortOrder: 4,
    },
    {
      key: "diary_streak_7",
      name: "seven dusks",
      flavor: "a full week of pages. i see you.",
      tapeColor: "#A89A8C",
      labelColor: "#15100E",
      rarity: "rare" as const,
      sortOrder: 5,
    },
    {
      key: "diary_streak_30",
      name: "a whole moon",
      flavor: "a month of dusk pages. this one is quiet and rare.",
      tapeColor: "#1E1815",
      labelColor: "#D89B7A",
      rarity: "rare" as const,
      sortOrder: 6,
    },
    {
      key: "tier_superfan",
      name: "superfan",
      flavor: "crossing the first threshold.",
      tapeColor: "#6B4A5E",
      labelColor: "#D89B7A",
      rarity: "rare" as const,
      sortOrder: 7,
    },
    {
      key: "tier_vip",
      name: "vip",
      flavor: "the inner circle. thank you for making this possible.",
      tapeColor: "#15100E",
      labelColor: "#D89B7A",
      rarity: "vip" as const,
      sortOrder: 8,
    },
    {
      key: "stranger_in_you",
      name: "stranger in you",
      flavor: "for the ones who found me first.",
      tapeColor: "#2A1A1F",
      labelColor: "#F4ECE2",
      rarity: "ephemeral" as const,
      sortOrder: 9,
    },
  ];
  for (const c of collectibles) {
    await prisma.collectible.upsert({
      where: { key: c.key },
      update: c,
      create: c,
    });
  }

  const songs = [
    {
      slug: "stranger-in-you",
      title: "Stranger In You",
      album: "In Copula",
      lyrics:
        "[add lyrics here in the admin — blank line between verses.]\n\n[verse one placeholder]\n\n[verse two placeholder]",
      noteFromEbril:
        "the first track. it carried so much of the record before anyone had heard it. thank you for finding me through it.",
      spotifyUrl: "https://ebril.lnk.to/strangerinyou",
      releaseDate: new Date("2025-05-01T00:00:00Z"),
      sortOrder: 1,
    },
    {
      slug: "anticipate-heartbreak",
      title: "Anticipate Heartbreak",
      album: "In Copula",
      lyrics: "[add lyrics here in the admin.]",
      spotifyUrl: "https://ebril.lnk.to/incopula",
      sortOrder: 2,
    },
  ];
  for (const s of songs) {
    await prisma.song.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  console.log("Seeded tiers, point packs, external links, collectibles, songs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
