import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tiers = [
    { name: "Fan", sortOrder: 1, thresholdCentsPerMonth: 100, multiplier: 1.0 },
    { name: "Superfan", sortOrder: 2, thresholdCentsPerMonth: 1500, multiplier: 1.25 },
    { name: "VIP", sortOrder: 3, thresholdCentsPerMonth: 5000, multiplier: 1.5 },
  ];
  for (const t of tiers) {
    await prisma.tier.upsert({
      where: { name: t.name },
      update: t,
      create: t,
    });
  }

  const packs = [
    { name: "Starter", points: 1000, priceCents: 1000, sortOrder: 1 },
    { name: "Boost", points: 5500, priceCents: 5000, sortOrder: 2 },
    { name: "Mega", points: 12000, priceCents: 10000, sortOrder: 3 },
  ];
  for (const p of packs) {
    const existing = await prisma.pointPack.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.pointPack.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.pointPack.create({ data: p });
    }
  }
  console.log("Seeded tiers and point packs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
