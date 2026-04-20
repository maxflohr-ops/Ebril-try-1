"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PostForm() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body,
        imageUrl: imageUrl || null,
        audioUrl: audioUrl || null,
        linkUrl: linkUrl || null,
        linkLabel: linkLabel || null,
        moodTag: moodTag || null,
        pinned,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("didn't save.");
      return;
    }
    setBody("");
    setImageUrl("");
    setAudioUrl("");
    setLinkUrl("");
    setLinkLabel("");
    setMoodTag("");
    setPinned(false);
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
      <label style={{ gridColumn: "span 4" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>moment</div>
        <textarea
          required
          style={{ ...input, minHeight: 110, resize: "vertical", lineHeight: 1.55 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="a short line in her voice. paragraphs separated by a blank line."
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>image url (optional)</div>
        <input
          style={input}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>audio url (optional)</div>
        <input
          style={input}
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>link url (optional)</div>
        <input style={input} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>link label</div>
        <input
          style={input}
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          placeholder="listen"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>mood (optional)</div>
        <input
          style={input}
          value={moodTag}
          onChange={(e) => setMoodTag(e.target.value)}
          placeholder="dusk"
        />
      </label>
      <label
        style={{
          gridColumn: "span 2",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
        }}
      >
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        pin to top of the feed
      </label>
      <div style={{ gridColumn: "span 2", display: "flex", alignItems: "end", gap: 12 }}>
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "post the moment"}
        </button>
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
