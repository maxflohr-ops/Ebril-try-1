"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS: { value: string; label: string }[] = [
  { value: "tiktok", label: "tiktok" },
  { value: "instagram_reel", label: "instagram reel" },
  { value: "youtube_short", label: "youtube short" },
  { value: "youtube", label: "youtube" },
  { value: "twitter", label: "twitter / x" },
  { value: "bluesky", label: "bluesky" },
  { value: "other", label: "somewhere else" },
];

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com/reel")) return "instagram_reel";
  if (u.includes("instagram.com")) return "instagram_reel";
  if (u.includes("youtube.com/shorts") || u.includes("youtu.be")) return "youtube_short";
  if (u.includes("youtube.com")) return "youtube";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("bsky.app")) return "bluesky";
  return "other";
}

export function ClipForm({ briefId }: { briefId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touchedPlatform, setTouchedPlatform] = useState(false);

  function onUrlChange(v: string) {
    setUrl(v);
    if (!touchedPlatform) setPlatform(detectPlatform(v));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/clips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ briefId, url, platform, caption: caption || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(errorCopy(body.error));
      return;
    }
    const body = await res.json();
    setUrl("");
    setCaption("");
    setTouchedPlatform(false);
    setResult(
      body.duplicate
        ? "already have that one — i'll get to it."
        : "got it. i'll look at it soon."
    );
    router.refresh();
  }

  const input: React.CSSProperties = {
    background: "transparent",
    color: "var(--text)",
    border: "none",
    borderBottom: "1px solid var(--border)",
    padding: "10px 0",
    fontFamily: "inherit",
    width: "100%",
    fontSize: 15,
  };

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 20 }}>
      <label style={{ display: "block", marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          link to your clip
        </div>
        <input
          required
          type="url"
          style={input}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.tiktok.com/@you/video/…"
        />
      </label>
      <label style={{ display: "block", marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          where it lives
        </div>
        <select
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setTouchedPlatform(true);
          }}
          style={{ ...input, borderBottom: "1px solid var(--border)" }}
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          anything you want me to know (optional)
        </div>
        <textarea
          rows={3}
          style={{
            ...input,
            borderBottom: "1px solid var(--border)",
            resize: "vertical",
          }}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "send it to me"}
        </button>
        {result && (
          <div style={{ color: "var(--success)", fontSize: 13 }}>{result}</div>
        )}
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}

function errorCopy(code?: string): string {
  switch (code) {
    case "rate_limited":
      return "that's enough takes for today. come back tomorrow.";
    case "not_open":
      return "this direction is closed right now.";
    case "invalid":
      return "check the link format.";
    default:
      return "didn't land. try again in a minute.";
  }
}
