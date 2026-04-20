"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SongForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [album, setAlbum] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [note, setNote] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleMusicUrl, setAppleMusicUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bandcampUrl, setBandcampUrl] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/songs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug || undefined,
        album: album || null,
        lyrics,
        noteFromEbril: note || null,
        artworkUrl: artworkUrl || null,
        releaseDate: releaseDate ? new Date(releaseDate + "T00:00:00Z").toISOString() : null,
        spotifyUrl: spotifyUrl || null,
        appleMusicUrl: appleMusicUrl || null,
        youtubeUrl: youtubeUrl || null,
        bandcampUrl: bandcampUrl || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("didn't save — check the fields.");
      return;
    }
    setTitle("");
    setSlug("");
    setAlbum("");
    setReleaseDate("");
    setLyrics("");
    setNote("");
    setSpotifyUrl("");
    setAppleMusicUrl("");
    setYoutubeUrl("");
    setBandcampUrl("");
    setArtworkUrl("");
    router.refresh();
  }

  const input: React.CSSProperties = {
    background: "#110D0B",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <form
      onSubmit={submit}
      className="admin-surface"
      style={{
        padding: 18,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
      }}
    >
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>title</div>
        <input required style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>slug (optional)</div>
        <input style={input} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>album</div>
        <input style={input} value={album} onChange={(e) => setAlbum(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>release date</div>
        <input
          type="date"
          style={input}
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          lyrics (blank line between verses)
        </div>
        <textarea
          required
          style={{ ...input, minHeight: 160, resize: "vertical", lineHeight: 1.55 }}
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>note from ebril (optional)</div>
        <textarea
          style={{ ...input, minHeight: 80, resize: "vertical", lineHeight: 1.55 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>spotify url</div>
        <input style={input} value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>apple music url</div>
        <input
          style={input}
          value={appleMusicUrl}
          onChange={(e) => setAppleMusicUrl(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>youtube url</div>
        <input style={input} value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>bandcamp url</div>
        <input
          style={input}
          value={bandcampUrl}
          onChange={(e) => setBandcampUrl(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>artwork url</div>
        <input style={input} value={artworkUrl} onChange={(e) => setArtworkUrl(e.target.value)} />
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "publish"}
        </button>
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
