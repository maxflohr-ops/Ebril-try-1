"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RitualForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [pointsReward, setPointsReward] = useState("25");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/rituals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        trackTitle: trackTitle || null,
        trackUrl: trackUrl || null,
        artworkUrl: artworkUrl || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        pointsReward: Number(pointsReward),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "failed");
      return;
    }
    setTitle("");
    setBody("");
    setTrackTitle("");
    setTrackUrl("");
    setArtworkUrl("");
    setStartsAt("");
    setEndsAt("");
    setPointsReward("25");
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
        <input
          required
          style={input}
          placeholder="press play at dusk"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>points reward</div>
        <input
          required
          type="number"
          min="0"
          style={input}
          value={pointsReward}
          onChange={(e) => setPointsReward(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>body (her voice)</div>
        <textarea
          required
          style={{ ...input, minHeight: 80, fontFamily: "inherit", resize: "vertical" }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="tonight at 9pm, wherever you are, press play with the lights off. tell me what the third verse did."
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>track title</div>
        <input
          style={input}
          value={trackTitle}
          onChange={(e) => setTrackTitle(e.target.value)}
          placeholder="stranger in you"
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>track url</div>
        <input
          style={input}
          value={trackUrl}
          onChange={(e) => setTrackUrl(e.target.value)}
          placeholder="https://open.spotify.com/track/..."
        />
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>artwork url (optional)</div>
        <input
          style={input}
          value={artworkUrl}
          onChange={(e) => setArtworkUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>starts</div>
        <input
          required
          type="datetime-local"
          style={input}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ends</div>
        <input
          required
          type="datetime-local"
          style={input}
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
      </label>
      <div style={{ display: "flex", alignItems: "end" }}>
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "schedule"}
        </button>
      </div>
      {error && (
        <div style={{ gridColumn: "1 / -1", color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}
    </form>
  );
}
