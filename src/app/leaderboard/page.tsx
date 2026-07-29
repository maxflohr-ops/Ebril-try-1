import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

interface Row {
  userId: string;
  points: number;
  clips: number;
  featured: number;
  carried: number;
  user: {
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
  highlight: { title: string; eraAccent: string } | null;
}

async function buildLeaderboard(sinceDays: number | null): Promise<Row[]> {
  const since = sinceDays ? new Date(Date.now() - sinceDays * 86_400_000) : null;

  const groups = await prisma.clip.groupBy({
    by: ["userId"],
    where: {
      pointsAwarded: { gt: 0 },
      ...(since ? { reviewedAt: { gte: since } } : {}),
    },
    _sum: { pointsAwarded: true },
    _count: { _all: true },
    orderBy: { _sum: { pointsAwarded: "desc" } },
    take: 25,
  });

  if (groups.length === 0) return [];

  const userIds = groups.map((g) => g.userId);
  const [users, featuredCounts, viralCounts, highlightClips] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, email: true, avatarUrl: true },
    }),
    prisma.clip.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        status: "featured",
        ...(since ? { featuredAt: { gte: since } } : {}),
      },
      _count: { _all: true },
    }),
    prisma.clip.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        status: "viral",
        ...(since ? { viralAt: { gte: since } } : {}),
      },
      _count: { _all: true },
    }),
    prisma.clip.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["featured", "viral"] },
        ...(since ? { reviewedAt: { gte: since } } : {}),
      },
      orderBy: [{ viralAt: "desc" }, { featuredAt: "desc" }, { createdAt: "desc" }],
      select: {
        userId: true,
        brief: { select: { title: true, era: { select: { accentColor: true } } } },
      },
    }),
  ]);

  const uMap = new Map(users.map((u) => [u.id, u]));
  const fMap = new Map(featuredCounts.map((f) => [f.userId, f._count._all]));
  const vMap = new Map(viralCounts.map((v) => [v.userId, v._count._all]));
  const hMap = new Map<string, Row["highlight"]>();
  for (const h of highlightClips) {
    if (!hMap.has(h.userId))
      hMap.set(h.userId, {
        title: h.brief.title,
        eraAccent: h.brief.era.accentColor,
      });
  }

  return groups.map((g) => ({
    userId: g.userId,
    points: g._sum.pointsAwarded ?? 0,
    clips: g._count._all,
    featured: fMap.get(g.userId) ?? 0,
    carried: vMap.get(g.userId) ?? 0,
    user: uMap.get(g.userId) ?? null,
    highlight: hMap.get(g.userId) ?? null,
  }));
}

function RankBadge({ rank }: { rank: number }) {
  const palette =
    rank === 1
      ? { bg: "linear-gradient(135deg,#D89B7A,#C97064)", color: "#15100E" }
      : rank === 2
        ? { bg: "#A89A8C", color: "#15100E" }
        : rank === 3
          ? { bg: "#6B4A5E", color: "#F4ECE2" }
          : { bg: "#1E1815", color: "var(--text-muted)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 999,
        background: palette.bg,
        color: palette.color,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "var(--font-fraunces), Georgia, serif",
        flexShrink: 0,
      }}
    >
      {rank}
    </span>
  );
}

function Row({
  row,
  rank,
  highlight,
}: {
  row: Row;
  rank: number;
  highlight: boolean;
}) {
  return (
    <article
      className="surface"
      style={{
        padding: 14,
        marginBottom: 10,
        display: "grid",
        gridTemplateColumns: "auto auto 1fr auto",
        gap: 14,
        alignItems: "center",
        background: highlight
          ? "linear-gradient(120deg, rgba(216,155,122,0.18) 0%, rgba(30,24,21,0.95) 60%)"
          : undefined,
        borderColor: highlight ? "rgba(216,155,122,0.35)" : undefined,
      }}
    >
      <RankBadge rank={rank} />
      {row.user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.user.avatarUrl}
          alt=""
          width={38}
          height={38}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
      ) : (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: "#1E1815",
            border: "1px solid var(--border)",
          }}
        />
      )}
      <div>
        <div
          className="serif"
          style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.2 }}
        >
          {row.user?.displayName?.toLowerCase() ?? row.user?.email ?? "anon"}
        </div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {row.clips} clip{row.clips === 1 ? "" : "s"}
          {row.featured ? ` · ${row.featured} held` : ""}
          {row.carried ? ` · ${row.carried} carried` : ""}
          {row.highlight ? (
            <>
              <span style={{ opacity: 0.5 }}> · </span>
              <span style={{ color: row.highlight.eraAccent }}>
                {row.highlight.title.toLowerCase()}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div
        className="serif"
        style={{
          fontSize: 24,
          fontWeight: 500,
          color: "var(--accent)",
          letterSpacing: "-0.02em",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {row.points.toLocaleString()}
      </div>
    </article>
  );
}

export default async function Leaderboard() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const [week, allTime] = await Promise.all([
    buildLeaderboard(7),
    buildLeaderboard(null),
  ]);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 96px" }}>
      <div className="eyebrow">leaderboard</div>
      <h2 style={{ marginTop: 6 }}>who&rsquo;s carrying the songs.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 15,
          marginTop: 10,
          maxWidth: 460,
        }}
      >
        the people who make clips and take the song out into the world. this is how we all
        see each other. rankings reset softly — this week sits on top, the all-time list
        underneath.
      </p>

      <section style={{ marginTop: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 14, color: "var(--accent)" }}>
          this week
        </div>
        {week.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            quiet week. send the first clip.{" "}
            <Link href="/eras" style={{ color: "var(--accent)" }}>
              find a direction →
            </Link>
          </p>
        ) : (
          week.map((r, i) => (
            <Row
              key={r.userId}
              row={r}
              rank={i + 1}
              highlight={r.userId === session.userId}
            />
          ))
        )}
      </section>

      <section style={{ marginTop: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>all time</div>
        {allTime.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            nothing yet — be the first name here.
          </p>
        ) : (
          allTime.map((r, i) => (
            <Row
              key={r.userId}
              row={r}
              rank={i + 1}
              highlight={r.userId === session.userId}
            />
          ))
        )}
      </section>
    </main>
  );
}
