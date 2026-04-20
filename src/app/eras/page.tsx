import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ErasIndex() {
  const [current, past] = await Promise.all([
    prisma.era.findFirst({
      where: { active: true, isCurrent: true },
      include: { _count: { select: { directions: { where: { active: true } } } } },
    }),
    prisma.era.findMany({
      where: { active: true, isCurrent: false },
      orderBy: [{ startsAt: "desc" }, { sortOrder: "asc" }],
      include: { _count: { select: { directions: true } } },
    }),
  ]);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 96px" }}>
      <div className="eyebrow">eras</div>
      <h2 style={{ marginTop: 6 }}>the worlds we&rsquo;re in together.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 480,
          marginTop: 10,
          fontSize: 15,
        }}
      >
        each era has its own look, its own directions, its own tape. make something inside
        the one we&rsquo;re in and i&rsquo;ll see it.
      </p>

      {current ? (
        <Link
          href={`/eras/${current.slug}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            marginTop: 32,
          }}
        >
          <article
            className="surface"
            style={{
              position: "relative",
              padding: 36,
              overflow: "hidden",
              background: `linear-gradient(160deg, ${current.accentColor}40 0%, ${current.secondaryColor}40 45%, rgba(21,16,14,0.98) 100%)`,
              borderColor: `${current.accentColor}44`,
              minHeight: 260,
            }}
          >
            {current.artworkUrl && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${current.artworkUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.18,
                  filter: "saturate(0.9)",
                }}
              />
            )}
            <div style={{ position: "relative" }}>
              <div
                className="eyebrow"
                style={{ color: current.accentColor }}
              >
                currently in · {current._count.directions} directions open
              </div>
              <h1 style={{ marginTop: 10, fontSize: 48, letterSpacing: "-0.02em" }}>
                {current.name.toLowerCase()}
              </h1>
              {current.tagline && (
                <div
                  className="serif"
                  style={{
                    fontSize: 19,
                    marginTop: 14,
                    fontStyle: "italic",
                    color: "var(--text)",
                    maxWidth: 520,
                    lineHeight: 1.5,
                  }}
                >
                  {current.tagline}
                </div>
              )}
              <div
                style={{
                  marginTop: 22,
                  color: "var(--text-muted)",
                  fontSize: 14,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                enter →
              </div>
            </div>
          </article>
        </Link>
      ) : (
        <div
          className="surface"
          style={{ padding: 24, marginTop: 28, textAlign: "center" }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            between eras. something new is coming.
          </div>
        </div>
      )}

      {past.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>past eras</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/eras/${e.slug}`}
                className="surface"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  padding: 18,
                  background: `linear-gradient(160deg, ${e.secondaryColor}22 0%, rgba(30,24,21,0.95) 75%)`,
                  borderColor: `${e.accentColor}22`,
                }}
              >
                <div
                  className="eyebrow"
                  style={{ color: e.accentColor }}
                >
                  archive
                </div>
                <div
                  className="serif"
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    marginTop: 8,
                    lineHeight: 1.2,
                  }}
                >
                  {e.name.toLowerCase()}
                </div>
                {e.tagline && (
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      marginTop: 8,
                      fontStyle: "italic",
                    }}
                  >
                    {e.tagline}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
