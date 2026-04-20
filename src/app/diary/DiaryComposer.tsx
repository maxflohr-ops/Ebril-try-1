"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MOODS: { value: string; label: string }[] = [
  { value: "dusk", label: "dusk" },
  { value: "dawn", label: "dawn" },
  { value: "threeam", label: "3am" },
  { value: "aching", label: "aching" },
  { value: "open", label: "open" },
  { value: "alone", label: "alone" },
  { value: "together", label: "together" },
  { value: "commute", label: "commute" },
];

export function DiaryComposer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [shared, setShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mood) {
      setError("pick a feeling first.");
      return;
    }
    if (!text.trim()) {
      setError("write a line or two.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/diary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        mood,
        trackTitle: trackTitle || null,
        trackUrl: trackUrl || null,
        sharedWithEbril: shared,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "didn't land.");
      return;
    }
    const body = await res.json();
    setMessage(
      body.credited
        ? `kept. +${body.pointsAwarded} points.`
        : "kept. (already earned today — write again for free.)"
    );
    setText("");
    setMood(null);
    setTrackTitle("");
    setTrackUrl("");
    setShared(false);
    router.refresh();
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {MOODS.map((m) => {
          const active = mood === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className="chip"
              style={{
                cursor: "pointer",
                background: active ? "rgba(216,155,122,0.2)" : "rgba(107,74,94,0.15)",
                color: active ? "var(--accent)" : "var(--text-muted)",
                borderColor: active ? "rgba(216,155,122,0.5)" : "var(--border)",
                transition: "all 200ms var(--ease)",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <textarea
        placeholder="a line. a paragraph. whatever the song asked of you."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        style={{
          width: "100%",
          background: "transparent",
          color: "var(--text)",
          border: "none",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontSize: 18,
          lineHeight: 1.55,
          resize: "vertical",
          padding: "10px 0",
          outline: "none",
          letterSpacing: "-0.01em",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 14,
        }}
      >
        <input
          className="input"
          placeholder="song title (optional)"
          value={trackTitle}
          onChange={(e) => setTrackTitle(e.target.value)}
        />
        <input
          className="input"
          placeholder="link (optional — spotify, apple, youtube)"
          value={trackUrl}
          onChange={(e) => setTrackUrl(e.target.value)}
        />
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 16,
          fontSize: 13,
          color: "var(--text-muted)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={shared}
          onChange={(e) => setShared(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        share this page with ebril (she reads them, not all of them, but some)
      </label>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "keep this page"}
        </button>
        {message && (
          <div style={{ color: "var(--success)", fontSize: 13 }}>{message}</div>
        )}
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
