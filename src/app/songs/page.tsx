import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

export default async function SongsPage() {
  const songs = await prisma.song.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { releaseDate: "desc" }, { title: "asc" }],
  });

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div className="eyebrow">songs</div>
      <h2 style={{ marginTop: 6 }}>the words, kept here.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 480,
          marginTop: 10,
          fontSize: 15,
        }}
      >
        every track with its own page — lyrics, a short note from me, links to where it
        streams. read with the song on.
      </p>

      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {songs.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            nothing published yet.
          </div>
        )}
        {songs.map((s) => (
          <Link
            key={s.id}
            href={`/songs/${s.slug}`}
            className="surface"
            style={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              textDecoration: "none",
              color: "inherit",
              transition: "transform 200ms var(--ease), border-color 200ms var(--ease)",
            }}
          >
            <div
              style={{
                aspectRatio: "1 / 1",
                background:
                  "linear-gradient(135deg, rgba(107,74,94,0.4), rgba(216,155,122,0.12))",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {s.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.artworkUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "saturate(0.92)",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(21,16,14,0) 55%, rgba(21,16,14,0.7) 100%)",
                  mixBlendMode: "multiply",
                }}
              />
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                className="serif"
                style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.25 }}
              >
                {s.title.toLowerCase()}
              </div>
              {(s.album || s.releaseDate) && (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.album?.toLowerCase()}
                  {s.album && s.releaseDate ? " · " : ""}
                  {s.releaseDate
                    ? `${MONTHS[s.releaseDate.getUTCMonth()]} ${s.releaseDate.getUTCFullYear()}`
                    : ""}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
