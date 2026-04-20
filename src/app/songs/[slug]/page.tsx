import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function longDate(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="nav-chip"
      style={{ textDecoration: "none" }}
    >
      {label} ↗
    </a>
  );
}

export default async function SongPage({
  params,
}: {
  params: { slug: string };
}) {
  const song = await prisma.song.findUnique({ where: { slug: params.slug } });
  if (!song || !song.active) notFound();

  // Split lyrics on blank lines so verses breathe as typographic blocks.
  const verses = song.lyrics
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((v) => v.trim())
    .filter(Boolean);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 96px" }}>
      <Link
        href="/songs"
        className="eyebrow"
        style={{ display: "inline-block", marginBottom: 20 }}
      >
        ← songs
      </Link>

      <header
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          padding: 32,
          background:
            "linear-gradient(160deg, rgba(107,74,94,0.55) 0%, rgba(30,24,21,0.97) 75%)",
          border: "1px solid rgba(255,255,255,0.04)",
          marginBottom: 36,
        }}
      >
        {song.artworkUrl && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${song.artworkUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.28,
              filter: "saturate(0.85) blur(2px)",
            }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          {song.album && (
            <div className="eyebrow" style={{ color: "var(--accent)" }}>
              {song.album.toLowerCase()}
            </div>
          )}
          <h1 style={{ marginTop: 10, fontSize: 44, letterSpacing: "-0.02em" }}>
            {song.title.toLowerCase()}
          </h1>
          {song.releaseDate && (
            <div
              style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 10 }}
            >
              out {longDate(song.releaseDate)}
            </div>
          )}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {song.spotifyUrl && <LinkPill href={song.spotifyUrl} label="spotify" />}
            {song.appleMusicUrl && <LinkPill href={song.appleMusicUrl} label="apple music" />}
            {song.youtubeUrl && <LinkPill href={song.youtubeUrl} label="youtube" />}
            {song.bandcampUrl && <LinkPill href={song.bandcampUrl} label="bandcamp" />}
          </div>
        </div>
      </header>

      {song.noteFromEbril && (
        <section style={{ marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>from me</div>
          <p
            className="serif"
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              fontStyle: "italic",
              color: "var(--text)",
              whiteSpace: "pre-wrap",
              letterSpacing: "-0.005em",
            }}
          >
            {song.noteFromEbril}
          </p>
        </section>
      )}

      <section>
        <div className="eyebrow" style={{ marginBottom: 14 }}>the words</div>
        <div style={{ display: "grid", gap: 28 }}>
          {verses.map((v, i) => (
            <p
              key={i}
              className="serif"
              style={{
                fontSize: 19,
                lineHeight: 1.75,
                margin: 0,
                whiteSpace: "pre-wrap",
                letterSpacing: "-0.005em",
                color: "var(--text)",
              }}
            >
              {v}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
