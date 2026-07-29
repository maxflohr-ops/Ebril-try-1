import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SeasonPassGrid } from "./SeasonPassGrid";

export const dynamic = "force-dynamic";

export default async function SeasonPassPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const now = new Date();
  const season = await prisma.seasonPass.findFirst({
    where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
    include: { rewards: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      minecraftAccount: { select: { mcUsername: true } },
      currentTier: { select: { sortOrder: true } },
    },
  });

  if (!season) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px 100px" }}>
        <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, marginBottom: 12 }}>
          season pass
        </h1>
        <div className="surface" style={{ padding: 24, color: "var(--text-muted)" }}>
          no season is live right now. one drops soon — keep an eye on your phone.
        </div>
      </main>
    );
  }

  const [latestSubs, grants] = await Promise.all([
    prisma.seasonPassSubmission.findMany({
      where: {
        userId: session.userId,
        rewardId: { in: season.rewards.map((r) => r.id) },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.seasonPassGrant.findMany({
      where: {
        userId: session.userId,
        rewardId: { in: season.rewards.map((r) => r.id) },
      },
    }),
  ]);

  const latestByReward = new Map<string, (typeof latestSubs)[number]>();
  for (const s of latestSubs) {
    if (!latestByReward.has(s.rewardId)) latestByReward.set(s.rewardId, s);
  }
  const grantedSet = new Set(grants.map((g) => g.rewardId));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 100px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="eyebrow" style={{ color: "var(--accent)" }}>season pass</div>
        <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, marginTop: 6, letterSpacing: "-0.02em" }}>
          {season.name.toLowerCase()}
        </h1>
        {season.tagline && (
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>
            {season.tagline}
          </p>
        )}
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12, letterSpacing: "0.06em" }}>
          {season.startsAt.toISOString().slice(0, 10)} → {season.endsAt.toISOString().slice(0, 10)}
        </div>
      </div>

      {!user?.minecraftAccount && (
        <div
          className="surface"
          style={{
            padding: 16,
            marginBottom: 20,
            borderColor: "rgba(216,155,122,0.35)",
            background: "linear-gradient(160deg, rgba(216,155,122,0.10) 0%, rgba(30,24,21,0.95) 70%)",
          }}
        >
          <div className="eyebrow" style={{ color: "var(--accent)" }}>
            link minecraft first
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.55 }}>
            season-pass rewards land in-game on the dusk server. open your{" "}
            <a href="/profile" style={{ color: "var(--accent)" }}>profile</a>{" "}
            and tap <em>link my minecraft account</em> so the rewards have somewhere to go.
          </div>
        </div>
      )}

      <SeasonPassGrid
        rewards={season.rewards.map((r) => {
          const sub = latestByReward.get(r.id) ?? null;
          return {
            id: r.id,
            key: r.key,
            name: r.name,
            description: r.description,
            kind: r.kind,
            imageUrl: r.imageUrl,
            minTierSortOrder: r.minTierSortOrder,
            granted: grantedSet.has(r.id),
            submission: sub
              ? {
                  id: sub.id,
                  status: sub.status,
                  contentType: sub.contentType,
                  contentBody: sub.contentBody,
                  reviewerNote: sub.reviewerNote,
                  createdAt: sub.createdAt.toISOString(),
                }
              : null,
          };
        })}
        currentTierSortOrder={user?.currentTier?.sortOrder ?? 0}
      />
    </main>
  );
}
