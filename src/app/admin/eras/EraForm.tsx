"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EraForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("#D89B7A");
  const [secondary, setSecondary] = useState("#6B4A5E");
  const [artwork, setArtwork] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/eras", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || undefined,
        tagline: tagline || null,
        description: description || null,
        accentColor: accent,
        secondaryColor: secondary,
        artworkUrl: artwork || null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isCurrent,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("didn't save.");
      return;
    }
    setName("");
    setSlug("");
    setTagline("");
    setDescription("");
    setArtwork("");
    setStartsAt("");
    setEndsAt("");
    setIsCurrent(false);
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
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>name</div>
        <input required style={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>slug (optional)</div>
        <input style={input} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => setIsCurrent(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        current era
      </label>
      <label style={{ gridColumn: "span 4" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tagline</div>
        <input
          style={input}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="a short sentence in her voice"
        />
      </label>
      <label style={{ gridColumn: "span 4" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>description</div>
        <textarea
          style={{ ...input, minHeight: 80, resize: "vertical", lineHeight: 1.55 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>accent (#hex)</div>
        <input
          style={input}
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          placeholder="#D89B7A"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>secondary (#hex)</div>
        <input
          style={input}
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
          placeholder="#6B4A5E"
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>artwork url</div>
        <input style={input} value={artwork} onChange={(e) => setArtwork(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>starts (optional)</div>
        <input
          type="datetime-local"
          style={input}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ends (optional)</div>
        <input
          type="datetime-local"
          style={input}
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
      </label>
      <div style={{ gridColumn: "span 2", display: "flex", alignItems: "end", gap: 12 }}>
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "start era"}
        </button>
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
