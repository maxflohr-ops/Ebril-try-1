/**
 * Bootstrap a demo season pass with rewards and a few submissions in
 * different statuses, so the screenshots have realistic content.
 *
 * Run once after seed-demo with:
 *   npx tsx prisma/seed-season-pass.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hana = await prisma.user.findUnique({ where: { patreonUserId: "demo-hana" } });
  const mars = await prisma.user.findUnique({ where: { patreonUserId: "demo-mars" } });
  if (!hana || !mars) throw new Error("seed-demo first");

  // One live season.
  await prisma.seasonPass.updateMany({ where: { active: true }, data: { active: false } });
  const now = new Date();
  const startsAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const season = await prisma.seasonPass.upsert({
    where: { slug: "dusk-2026" },
    create: {
      slug: "dusk-2026",
      name: "dusk season",
      tagline: "claim a piece of the world this season. show me what you make.",
      startsAt,
      endsAt,
      active: true,
    },
    update: { active: true, startsAt, endsAt },
  });

  const rewards = [
    {
      key: "dusk_cape",
      name: "the dusk cape",
      description: "a cosmetic cape with the dusk gradient — show me a screenshot of your character standing somewhere golden.",
      kind: "cosmetic" as const,
      sortOrder: 0,
      minTierSortOrder: 0,
    },
    {
      key: "homestead_plot",
      name: "a homestead plot",
      description: "a 32×32 protected plot near spawn. submit a sketch of what you want to build there.",
      kind: "plot" as const,
      sortOrder: 1,
      minTierSortOrder: 1,
    },
    {
      key: "title_keeper",
      name: "the keeper title",
      description: "the [keeper] chat prefix. tell me one thing on the server you've quietly looked after.",
      kind: "title" as const,
      sortOrder: 2,
      minTierSortOrder: 1,
    },
    {
      key: "signed_disc",
      name: "a signed music disc",
      description: "an in-game music disc with otherside on it. submit a clip of you playing one of my songs in the cassette lounge.",
      kind: "item" as const,
      sortOrder: 3,
      minTierSortOrder: 2,
    },
    {
      key: "moonview_tower",
      name: "the moonview tower",
      description: "a private 8-story tower on the eastern cliff. send a moodboard of the interior.",
      kind: "plot" as const,
      sortOrder: 4,
      minTierSortOrder: 3,
    },
  ];

  const created: Record<string, string> = {};
  for (const r of rewards) {
    const row = await prisma.seasonPassReward.upsert({
      where: { seasonPassId_key: { seasonPassId: season.id, key: r.key } },
      create: { seasonPassId: season.id, ...r },
      update: r,
    });
    created[r.key] = row.id;
  }

  // hana's submissions: one earned, one in-review, one returned, two open
  await prisma.seasonPassGrant.deleteMany({ where: { userId: hana.id } });
  await prisma.seasonPassSubmission.deleteMany({ where: { userId: hana.id } });

  // earned: dusk_cape (approved → grant)
  const approved = await prisma.seasonPassSubmission.create({
    data: {
      userId: hana.id,
      rewardId: created.dusk_cape,
      contentType: "url",
      contentBody: "https://imgur.com/hana-dusk-rooftop-shot",
      status: "approved",
      reviewerNote: "the colour grading is exactly the brief — it's yours.",
      decidedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      decidedBy: mars.id,
    },
  });
  await prisma.seasonPassGrant.create({
    data: {
      userId: hana.id,
      rewardId: created.dusk_cape,
      submissionId: approved.id,
      refId: `season:${created.dusk_cape}:${hana.id}`,
    },
  });

  // pending: homestead_plot (in queue)
  await prisma.seasonPassSubmission.create({
    data: {
      userId: hana.id,
      rewardId: created.homestead_plot,
      contentType: "text",
      contentBody:
        "i want a small two-room cottage with a garden out front — herbs and a lavender hedge. one window facing east so the sun comes in early. nothing tall, nothing loud. a place to leave gifts.",
      status: "pending",
    },
  });

  // returned: title_keeper (rejected, fan can resubmit)
  await prisma.seasonPassSubmission.create({
    data: {
      userId: hana.id,
      rewardId: created.title_keeper,
      contentType: "text",
      contentBody: "i'm just here every day, mostly.",
      status: "rejected",
      reviewerNote: "tell me one thing specifically — a build, a player you helped, a corner you swept. resubmit when you have one.",
      decidedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      decidedBy: mars.id,
    },
  });

  // signed_disc + moonview_tower left open (different tier states)

  // A pending submission from another fan to populate the mod queue screenshot
  const lyrie = await prisma.user.findUnique({ where: { patreonUserId: "demo-lyrie" } });
  if (lyrie) {
    await prisma.seasonPassSubmission.deleteMany({ where: { userId: lyrie.id } });
    await prisma.seasonPassSubmission.create({
      data: {
        userId: lyrie.id,
        rewardId: created.dusk_cape,
        contentType: "url",
        contentBody: "https://twitter.com/lyrie/status/1234567890",
        status: "pending",
      },
    });
  }
  const noor = await prisma.user.findUnique({ where: { patreonUserId: "demo-noor" } });
  if (noor) {
    await prisma.seasonPassSubmission.deleteMany({ where: { userId: noor.id } });
    await prisma.seasonPassSubmission.create({
      data: {
        userId: noor.id,
        rewardId: created.homestead_plot,
        contentType: "text",
        contentBody:
          "a greenhouse — glass roof, raised beds, a little reading bench at the end. nothing about it should feel finished, like it's still becoming. i want to grow the lavender from your album cover here.",
        status: "pending",
      },
    });
  }

  console.log("seeded:");
  console.log("  season:", season.slug);
  console.log("  rewards:", Object.keys(created).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
