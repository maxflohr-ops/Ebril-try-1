"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Era {
  id: string;
  name: string;
  accentColor: string;
  isCurrent: boolean;
}
interface Song {
  id: string;
  title: string;
}

export function DirectionForm({ eras, songs }: { eras: Era[]; songs: Song[] }) {
  const router = useRouter();
  const current = eras.find((e) => e.isCurrent) ?? eras[0];
  const [eraId, setEraId] = useState(current.id);
  const [songId, setSongId] = useState("");
  const [title, setTitle] = useState("");
  const [direction, setDirection] = useState("");
  const [exampleUrl, setExampleUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [platformHint, setPlatformHint] = useState("tiktok");
  const [hashtagHint, setHashtagHint] = useState("");
  const [pointsApproved, setPointsApproved] = useState("100");
  const [pointsFeatured, setPointsFeatured] = useState("500");
  const [pointsViral, setPointsViral] = useState("2500");
  const [viralThreshold, setViralThreshold] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/directions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eraId,
        songId: songId || null,
        title,
        direction,
        exampleUrl: exampleUrl || null,
        coverUrl: coverUrl || null,
        platformHint: platformHint || null,
        hashtagHint: hashtagHint || null,
        pointsApproved: Number(pointsApproved),
        pointsFeatured: Number(pointsFeatured),
        pointsViral: Number(pointsViral),
        viralThreshold: viralThreshold ? Number(viralThreshold) : null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        body.error === "featured_must_exceed_approved"
          ? "featured points must be higher than approved."
          : body.error === "viral_must_exceed_featured"
            ? "viral points must be higher than featured."
            : "didn't save."
      );
      return;
    }
    setTitle("");
    setDirection("");
    setExampleUrl("");
    setCoverUrl("");
    setHashtagHint("");
    setViralThreshold("");
    setSongId("");
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
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
      }}
    >
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>era</div>
        <select style={input} value={eraId} onChange={(e) => setEraId(e.target.value)}>
          {eras.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
              {e.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>song (optional)</div>
        <select style={input} value={songId} onChange={(e) => setSongId(e.target.value)}>
          <option value="">none</option>
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "span 4" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>title</div>
        <input
          required
          style={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="dusk window, stranger in you"
        />
      </label>
      <label style={{ gridColumn: "span 4" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          direction (what you want them to make — her voice)
        </div>
        <textarea
          required
          style={{ ...input, minHeight: 110, resize: "vertical", lineHeight: 1.55 }}
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="film the view from your window right before it goes dark. soundtrack it to stranger in you. no talking, just light."
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>reference url (optional)</div>
        <input
          style={input}
          value={exampleUrl}
          onChange={(e) => setExampleUrl(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>cover url</div>
        <input style={input} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>platform hint</div>
        <input
          style={input}
          value={platformHint}
          onChange={(e) => setPlatformHint(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>hashtag hint</div>
        <input
          style={input}
          value={hashtagHint}
          onChange={(e) => setHashtagHint(e.target.value)}
          placeholder="dusk"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>kept (pts)</div>
        <input
          required
          type="number"
          min="0"
          style={input}
          value={pointsApproved}
          onChange={(e) => setPointsApproved(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>held (pts)</div>
        <input
          required
          type="number"
          min="0"
          style={input}
          value={pointsFeatured}
          onChange={(e) => setPointsFeatured(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>carried (pts)</div>
        <input
          required
          type="number"
          min="0"
          style={input}
          value={pointsViral}
          onChange={(e) => setPointsViral(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          viral threshold (views — optional guide)
        </div>
        <input
          type="number"
          min="0"
          style={input}
          value={viralThreshold}
          onChange={(e) => setViralThreshold(e.target.value)}
          placeholder="e.g. 250000"
        />
      </label>
      <div style={{ gridColumn: "span 4", display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "publish direction"}
        </button>
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
