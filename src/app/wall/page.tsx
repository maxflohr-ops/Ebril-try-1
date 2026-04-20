import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "tiktok",
  instagram_reel: "instagram reel",
  youtube_short: "youtube short",
  youtube: "youtube",
  twitter: "x",
  bluesky: "bluesky",
  other: "link",
};

export default async function Wall() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const clips = await prisma.clip.findMany({
    where: { status: { in: ["featured", "viral"] } },
    orderBy: [{ viralAt: "desc" }, { featuredAt: "desc" }, { createdAt: "desc" }],
    take: 60,
    include: {
      brief: {
        select: {
          title: true,
          era: { select: { name: true, slug: true, accentColor: true, secondaryColor: true } },
        },
      },
    },
  });

  // Group by era so the wall has a sense of timeline.
  const byEra = new Map<
    string,
    { era: (typeof clips)[number]["brief"]["era"]; rows: typeof clips }
  >();
  for (const c of clips) {
    const key = c.brief.era.slug;
    const row = byEra.get(key);
    if (row) row.rows.push(c);
    else byEra.set(key, { era: c.brief.era, rows: [c] });
  }

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 96px" }}>
      <div className="eyebrow">the wall</div>
      <h2 style={{ marginTop: 6 }}>what you&rsquo;ve made for each other.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 15,
          marginTop: 10,
          maxWidth: 520,
        }}
      >
        clips i held onto or that carried the song further. tap any of them to go watch on
        the platform they were made for.
      </p>

      {clips.length === 0 && (
        <div
          className="surface"
          style={{ padding: 32, marginTop: 28, textAlign: "center" }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            nothing on the wall yet. be the first.{" "}
            <Link href="/eras" style={{ color: "var(--accent)" }}>
              find a direction →
            </Link>
          </div>
        </div>
      )}

      {Array.from(byEra.values()).map(({ era, rows }) => (
        <section key={era.slug} style={{ marginTop: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                className="eyebrow"
                style={{ color: era.accentColor }}
              >
                {era.name.toLowerCase()}
              </div>
            </div>
            <Link
              href={`/eras/${era.slug}`}
              style={{ color: "var(--text-muted)", fontSize: 13 }}
            >
              enter the era →
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {rows.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noreferrer noopener"
                className="surface"
                style={{
                  padding: 16,
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: `linear-gradient(160deg, ${era.secondaryColor}22 0%, rgba(30,24,21,0.95) 75%)`,
                  borderColor: `${era.accentColor}22`,
                  minHeight: 160,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {PLATFORM_LABEL[c.platform] ?? c.platform}
                  </span>
                  {c.status === "viral" && (
                    <span className="chip chip-success">carried</span>
                  )}
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.25 }}
                >
                  {c.brief.title.toLowerCase()}
                </div>
                {c.caption && (
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      flex: 1,
                    }}
                  >
                    {c.caption}
                  </div>
                )}
                <div style={{ color: era.accentColor, fontSize: 13, marginTop: "auto" }}>
                  watch it ↗
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
