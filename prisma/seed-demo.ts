/**
 * Demo seed — drops in after prisma/seed.ts, populates the app with
 * realistic-looking activity so every surface shows life at a glance.
 *
 *   npx tsx prisma/seed.ts          (base catalog: tiers, packs, songs, era, directions, links)
 *   npx tsx prisma/seed-demo.ts     (this file: fake fans + their histories)
 *
 * Safe to re-run — every insert upserts by a stable key.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DemoPerson {
  patreonUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  tierName: "Fan" | "Superfan" | "VIP";
  pledgeCents: number;
  // which stories to wire up for them.
  personas: Array<"diarist" | "clipper" | "gifter" | "showgoer" | "admin">;
}

const PEOPLE: DemoPerson[] = [
  {
    patreonUserId: "demo-hana",
    email: "hana@copula.demo",
    displayName: "hana",
    avatarUrl: "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=hana&backgroundColor=2A1A1F",
    tierName: "Superfan",
    pledgeCents: 2000,
    personas: ["diarist", "gifter", "showgoer"],
  },
  {
    patreonUserId: "demo-mars",
    email: "mars@copula.demo",
    displayName: "mars",
    avatarUrl: "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=mars&backgroundColor=6B4A5E",
    tierName: "VIP",
    pledgeCents: 6000,
    personas: ["clipper", "showgoer", "admin"],
  },
  {
    patreonUserId: "demo-lyrie",
    email: "lyrie@copula.demo",
    displayName: "lyrie",
    avatarUrl: "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=lyrie&backgroundColor=15100E",
    tierName: "Fan",
    pledgeCents: 500,
    personas: ["diarist"],
  },
  {
    patreonUserId: "demo-noor",
    email: "noor@copula.demo",
    displayName: "noor",
    avatarUrl: "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=noor&backgroundColor=C97064",
    tierName: "Superfan",
    pledgeCents: 2500,
    personas: ["clipper", "gifter"],
  },
  {
    patreonUserId: "demo-rhea",
    email: "rhea@copula.demo",
    displayName: "rhea",
    avatarUrl: "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=rhea&backgroundColor=8BA888",
    tierName: "Fan",
    pledgeCents: 500,
    personas: ["showgoer"],
  },
];

const DIARY_MOODS = ["dusk", "dawn", "threeam", "aching", "open", "together"] as const;
const DIARY_LINES = [
  "walked home and the sky was exactly the color of the record cover. the track did what it does. kept.",
  "couldn't sleep until i pressed play one more time. this is that kind of tired.",
  "put it on in the kitchen while i waited for water to boil. i think the song got cooked too.",
  "my sister called crying. i played stranger in you for her without saying anything. she heard me.",
  "riding the bus with headphones, watching the streetlights change color at the intersection, feeling like i could live.",
  "feels like an unmade bed kind of day. slow. peach light under the door.",
];

const DAY_MS = 86_400_000;

async function main() {
  // Baseline catalog must exist — era, tiers, songs, directions, collectibles.
  // If you haven't run the main seed yet this won't blow up, just do less.
  const [era, directions, tiers, welcomeCollectible] = await Promise.all([
    prisma.era.findFirst({ where: { slug: "in-copula" } }),
    prisma.clippingBrief.findMany({
      where: { era: { slug: "in-copula" }, active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.tier.findMany(),
    prisma.collectible.findUnique({ where: { key: "welcome_in" } }),
  ]);
  const tierByName = new Map(tiers.map((t) => [t.name, t]));

  // Users
  const users = await Promise.all(
    PEOPLE.map((p) =>
      prisma.user.upsert({
        where: { patreonUserId: p.patreonUserId },
        update: {
          email: p.email,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          currentTierId: tierByName.get(p.tierName)?.id ?? null,
          onboardedAt: new Date(Date.now() - 14 * DAY_MS),
        },
        create: {
          patreonUserId: p.patreonUserId,
          email: p.email,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          currentTierId: tierByName.get(p.tierName)?.id ?? null,
          onboardedAt: new Date(Date.now() - 14 * DAY_MS),
        },
      })
    )
  );

  // Active pledges for each demo fan — every paid charge produces a ledger
  // row too, so the /wrapped + leaderboard have real numbers.
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const p = PEOPLE[i];
    await prisma.pledge.upsert({
      where: { patreonPledgeId: `demo-pledge-${p.patreonUserId}` },
      update: {
        amountCents: p.pledgeCents,
        status: "active",
        lastChargedAt: new Date(Date.now() - 2 * DAY_MS),
      },
      create: {
        userId: u.id,
        patreonPledgeId: `demo-pledge-${p.patreonUserId}`,
        amountCents: p.pledgeCents,
        currency: "USD",
        status: "active",
        startedAt: new Date(Date.now() - 60 * DAY_MS),
        lastChargedAt: new Date(Date.now() - 2 * DAY_MS),
      },
    });

    // Two months of "pledge_charge" history so the leaderboard + /wrapped
    // have numbers that look lived-in.
    for (let m = 0; m < 2; m++) {
      const refId = `demo:charge:${p.patreonUserId}:${m}`;
      const amountCents = p.pledgeCents;
      try {
        await prisma.pointTransaction.create({
          data: {
            userId: u.id,
            delta: Math.floor((amountCents / 100) * 10),
            reason: "pledge_charge",
            refId,
            expiresAt: new Date(Date.now() + 540 * DAY_MS),
            createdAt: new Date(Date.now() - (m + 1) * 30 * DAY_MS),
          },
        });
      } catch {
        // already seeded, skip
      }
    }

    if (welcomeCollectible) {
      await prisma.collectibleGrant
        .create({
          data: {
            userId: u.id,
            collectibleId: welcomeCollectible.id,
            reason: "demo · first sign-in",
            grantedAt: new Date(Date.now() - 14 * DAY_MS),
          },
        })
        .catch(() => {});
    }
  }

  const userByName = new Map(PEOPLE.map((p, i) => [p.displayName, users[i]]));

  // Diarist histories — vary density so /leaderboard + /wrapped differ.
  for (const p of PEOPLE.filter((x) => x.personas.includes("diarist"))) {
    const u = userByName.get(p.displayName)!;
    for (let d = 0; d < 5; d++) {
      const at = new Date(Date.now() - d * DAY_MS - 6 * 3600_000);
      try {
        await prisma.diaryEntry.create({
          data: {
            userId: u.id,
            text: DIARY_LINES[(d + p.displayName.length) % DIARY_LINES.length],
            mood: DIARY_MOODS[(d + p.displayName.length) % DIARY_MOODS.length] as never,
            sharedWithEbril: d === 0 && p.displayName === "hana",
            createdAt: at,
          },
        });
        await prisma.pointTransaction.create({
          data: {
            userId: u.id,
            delta: 10,
            reason: "diary_entry",
            refId: `demo:diary:${u.id}:${at.toISOString().slice(0, 10)}`,
            expiresAt: new Date(Date.now() + 540 * DAY_MS),
            createdAt: at,
          },
        });
      } catch {
        // re-runs are fine.
      }
    }
  }

  // Clipper histories — submit against each direction at various statuses
  // so the /admin/clips queue + /wall have visible activity.
  const clipPersonas = PEOPLE.filter((x) => x.personas.includes("clipper"));
  for (let ci = 0; ci < clipPersonas.length; ci++) {
    const p = clipPersonas[ci];
    const u = userByName.get(p.displayName)!;
    for (let di = 0; di < directions.length; di++) {
      const dir = directions[di];
      // Status cycles per fan so we see all four on the wall / queue.
      const statuses = ["pending", "approved", "featured", "viral"] as const;
      const status = statuses[(ci * directions.length + di) % statuses.length];
      const createdAt = new Date(Date.now() - (di + 1) * 2 * DAY_MS);
      const existing = await prisma.clip.findFirst({
        where: { userId: u.id, briefId: dir.id },
      });
      if (existing) continue;
      const awardedMap: Record<string, number> = {
        pending: 0,
        approved: dir.pointsApproved,
        featured: dir.pointsFeatured,
        viral: dir.pointsViral,
      };
      const awarded = awardedMap[status];
      const clip = await prisma.clip.create({
        data: {
          userId: u.id,
          briefId: dir.id,
          platform: "tiktok",
          url: `https://www.tiktok.com/@${p.displayName}/video/demo-${di}-${ci}`,
          caption: `demo take: ${dir.title.toLowerCase()}`,
          status,
          pointsAwarded: awarded,
          viewCount:
            status === "viral" ? 320_000 : status === "featured" ? 40_000 : 2_400,
          viewCountUpdatedAt: new Date(),
          reviewedAt: status === "pending" ? null : new Date(Date.now() - di * DAY_MS),
          featuredAt:
            status === "featured" || status === "viral"
              ? new Date(Date.now() - di * DAY_MS)
              : null,
          viralAt: status === "viral" ? new Date(Date.now() - di * DAY_MS) : null,
          urlStatus: "unknown",
          urlStatusCode: 403,
          urlCheckedAt: new Date(),
          createdAt,
        },
      });
      if (awarded > 0) {
        await prisma.pointTransaction.create({
          data: {
            userId: u.id,
            delta: awarded,
            reason: "clip_approved",
            refId: `clip:${clip.id}:${status}`,
            expiresAt: new Date(Date.now() + 540 * DAY_MS),
            createdAt,
          },
        });
      }
    }
  }

  // A pinned "moment" post so landing + /posts have Ebril speaking.
  await prisma.post.upsert({
    where: { id: "demo-post-1" },
    update: {},
    create: {
      id: "demo-post-1",
      body: "back in the room tonight. thinking about the window recordings i took in amman — one of them is probably going to be the intro of the next song. no promises.\n\nif you're reading this: write a dusk page. one sentence is enough. xo",
      moodTag: "dusk",
      pinned: true,
      publishedAt: new Date(Date.now() - 18 * 3600_000),
    },
  });

  // Active ritual for tonight so home has something to claim.
  const ritualSong = await prisma.song.findFirst({ where: { slug: "stranger-in-you" } });
  await prisma.ritual.upsert({
    where: { id: "demo-ritual-1" },
    update: {
      startsAt: new Date(Date.now() - 2 * 3600_000),
      endsAt: new Date(Date.now() + 22 * 3600_000),
    },
    create: {
      id: "demo-ritual-1",
      title: "press play at dusk",
      body: "tonight at your local dusk, wherever you are, press play on stranger in you. lights low if you can manage it. i'll know.",
      trackTitle: ritualSong?.title ?? "stranger in you",
      trackUrl: ritualSong?.spotifyUrl ?? "https://ebril.lnk.to/strangerinyou",
      startsAt: new Date(Date.now() - 2 * 3600_000),
      endsAt: new Date(Date.now() + 22 * 3600_000),
      pointsReward: 50,
    },
  });

  // Open-tier voice note so /notes has something to listen to.
  await prisma.voiceNote.upsert({
    where: { id: "demo-note-1" },
    update: {},
    create: {
      id: "demo-note-1",
      title: "thirty seconds before bed",
      caption:
        "something i was humming in the stairwell on the way up. not finished, barely a song. just wanted you to hear it.",
      audioUrl:
        "https://cdn.copula.demo/placeholder-30s.mp3", // swap for real file at launch
      durationSec: 30,
      publishedAt: new Date(Date.now() - 3 * DAY_MS),
      active: true,
    },
  });

  // Tour dates — one past, two upcoming.
  for (const d of [
    { id: "demo-show-1", city: "Hamilton", venue: "Casbah", delta: -30 },
    { id: "demo-show-2", city: "Toronto", venue: "The Garrison", delta: 14 },
    { id: "demo-show-3", city: "Brooklyn", venue: "Baby's All Right", delta: 28 },
  ]) {
    await prisma.tourDate.upsert({
      where: { id: d.id },
      update: {
        startsAt: new Date(Date.now() + d.delta * DAY_MS),
      },
      create: {
        id: d.id,
        city: d.city,
        venue: d.venue,
        country: "CA",
        startsAt: new Date(Date.now() + d.delta * DAY_MS),
        ticketUrl: "https://ebril.lnk.to/tickets",
        noteFromEbril:
          d.delta < 0
            ? "thank you for being there. i felt you in the quiet parts."
            : "come early, stay late. i want to see your faces in the front.",
        pointsReward: 100,
      },
    });
  }

  // Gifts so /gift has received + sent rows, and /profile shows a warm rail.
  const hana = userByName.get("hana")!;
  const mars = userByName.get("mars")!;
  const noor = userByName.get("noor")!;
  const rhea = userByName.get("rhea")!;
  for (const g of [
    { from: mars, to: hana, amount: 250, note: "for the late-night message. kept me up." },
    { from: noor, to: hana, amount: 100, note: "loved your last diary share." },
    { from: hana, to: rhea, amount: 150, note: "for coming to the show. your face in row 2 got me." },
  ]) {
    const existing = await prisma.gift.findFirst({
      where: { fromUserId: g.from.id, toUserId: g.to.id, note: g.note },
    });
    if (existing) continue;
    const created = await prisma.gift.create({
      data: {
        fromUserId: g.from.id,
        toUserId: g.to.id,
        amount: g.amount,
        note: g.note,
        createdAt: new Date(Date.now() - 2 * DAY_MS),
      },
    });
    try {
      await prisma.pointTransaction.createMany({
        data: [
          {
            userId: g.from.id,
            delta: -g.amount,
            reason: "gift_sent",
            refId: `gift:out:${created.id}`,
            createdAt: created.createdAt,
          },
          {
            userId: g.to.id,
            delta: g.amount,
            reason: "gift_received",
            refId: `gift:in:${created.id}`,
            createdAt: created.createdAt,
          },
        ],
      });
    } catch {}
  }

  console.log(`Demo seeded. Visit /demo to sign in as one of:`);
  for (const p of PEOPLE) {
    console.log(`  · ${p.displayName} (${p.tierName})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
