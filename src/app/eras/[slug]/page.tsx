import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EraPage({
  params,
}: {
  params: { slug: string };
}) {
  const era = await prisma.era.findUnique({
    where: { slug: params.slug },
    include: {
      directions: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          song: { select: { title: true, slug: true } },
          _count: { select: { clips: { where: { status: { in: ["featured", "viral"] } } } } },
        },
      },
    },
  });
  if (!era || !era.active) notFound();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 96px" }}>
      <Link
        href="/eras"
        className="eyebrow"
        style={{ display: "inline-block", marginBottom: 20 }}
      >
        ← eras
      </Link>

      <header
        style={{
          position: "relative",
          borderRadius: 24,
          overflow: "hidden",
          padding: 40,
          background: `linear-gradient(160deg, ${era.accentColor}33 0%, ${era.secondaryColor}44 50%, rgba(21,16,14,0.98) 100%)`,
          border: `1px solid ${era.accentColor}33`,
        }}
      >
        {era.artworkUrl && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${era.artworkUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.22,
            }}
          />
        )}
        <div style={{ position: "relative" }}>
          <div
            className="eyebrow"
            style={{ color: era.accentColor }}
          >
            {era.isCurrent ? "currently in" : "archive"}
          </div>
          <h1
            style={{
              marginTop: 10,
              fontSize: 52,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            {era.name.toLowerCase()}
          </h1>
          {era.tagline && (
            <div
              className="serif"
              style={{
                fontSize: 20,
                marginTop: 14,
                fontStyle: "italic",
                maxWidth: 560,
                lineHeight: 1.5,
              }}
            >
              {era.tagline}
            </div>
          )}
          {era.description && (
            <p
              style={{
                color: "var(--text-muted)",
                maxWidth: 560,
                marginTop: 18,
                fontSize: 15,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {era.description}
            </p>
          )}
        </div>
      </header>

      <section style={{ marginTop: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          directions {era.isCurrent ? "open" : "from this era"}
        </div>
        {era.directions.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            no directions yet. come back soon.
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {era.directions.map((d) => (
            <Link
              key={d.id}
              href={`/clip/${d.id}`}
              className="surface"
              style={{
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                background: `linear-gradient(160deg, ${era.secondaryColor}22 0%, rgba(30,24,21,0.96) 80%)`,
                borderColor: `${era.accentColor}22`,
              }}
            >
              {d.coverUrl ? (
                <div
                  style={{
                    aspectRatio: "16 / 9",
                    background:
                      "linear-gradient(135deg, rgba(107,74,94,0.4), rgba(216,155,122,0.12))",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.coverUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "saturate(0.9)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(21,16,14,0) 50%, rgba(21,16,14,0.85) 100%)",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    aspectRatio: "16 / 9",
                    background: `linear-gradient(135deg, ${era.accentColor}30, ${era.secondaryColor}30)`,
                  }}
                />
              )}
              <div
                style={{
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: 1,
                }}
              >
                {d.song && (
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: era.accentColor,
                    }}
                  >
                    ♪ {d.song.title.toLowerCase()}
                  </div>
                )}
                <div
                  className="serif"
                  style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2 }}
                >
                  {d.title.toLowerCase()}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    lineHeight: 1.55,
                    flex: 1,
                  }}
                >
                  {d.direction.split("\n")[0]}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>
                    up to{" "}
                    <strong style={{ color: "var(--accent)" }}>
                      {d.pointsViral.toLocaleString()}
                    </strong>{" "}
                    pts
                  </span>
                  {d._count.clips > 0 && (
                    <span>{d._count.clips} on the wall</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
