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
  console.log("Seeded tiers.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
