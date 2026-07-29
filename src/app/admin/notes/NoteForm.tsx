"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NoteForm({ tiers }: { tiers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("30");
  const [tierRequiredId, setTierRequiredId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const durationSec = Number(minutes) * 60 + Number(seconds);
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        caption,
        audioUrl,
        durationSec,
        tierRequiredId: tierRequiredId || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "didn't save");
      return;
    }
    setTitle("");
    setCaption("");
    setAudioUrl("");
    setMinutes("0");
    setSeconds("30");
    setTierRequiredId("");
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
        gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
        gap: 10,
        alignItems: "end",
      }}
    >
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>title</div>
        <input
          required
          style={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="a thirty-second thing before bed"
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tier gate</div>
        <select
          style={input}
          value={tierRequiredId}
          onChange={(e) => setTierRequiredId(e.target.value)}
        >
          <option value="">everyone</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}+
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "span 5" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>caption (her voice)</div>
        <textarea
          required
          style={{ ...input, minHeight: 60, resize: "vertical" }}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="something i was humming. not finished."
        />
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>audio url</div>
        <input
          required
          style={input}
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://... .mp3 or .m4a"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>min</div>
        <input
          required
          type="number"
          min="0"
          style={input}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>sec</div>
        <input
          required
          type="number"
          min="0"
          max="59"
          style={input}
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
        />
      </label>
      <button type="submit" disabled={submitting} className="btn">
        {submitting ? "…" : "publish"}
      </button>
      {error && (
        <div style={{ gridColumn: "1 / -1", color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}
    </form>
  );
}
