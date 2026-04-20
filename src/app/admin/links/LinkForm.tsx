"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KINDS: { value: string; label: string; placeholder: string }[] = [
  { value: "spotify_artist", label: "spotify (artist page)", placeholder: "https://open.spotify.com/artist/..." },
  { value: "spotify_featured", label: "spotify (featured track/album)", placeholder: "https://open.spotify.com/track/..." },
  { value: "youtube_channel", label: "youtube channel", placeholder: "https://youtube.com/@ebril" },
  { value: "youtube_featured", label: "youtube (featured video)", placeholder: "https://youtube.com/watch?v=..." },
  { value: "apple_music", label: "apple music", placeholder: "https://music.apple.com/..." },
  { value: "shopify_store", label: "merch (shopify store)", placeholder: "https://shop.ebril.com" },
  { value: "bandcamp", label: "bandcamp", placeholder: "https://ebril.bandcamp.com" },
  { value: "soundcloud", label: "soundcloud", placeholder: "https://soundcloud.com/ebril" },
  { value: "instagram", label: "instagram", placeholder: "https://instagram.com/ebril" },
  { value: "tiktok", label: "tiktok", placeholder: "https://tiktok.com/@ebril" },
  { value: "discord", label: "discord", placeholder: "https://discord.gg/..." },
  { value: "website", label: "website", placeholder: "https://ebril.com" },
];

export function LinkForm() {
  const router = useRouter();
  const [kind, setKind] = useState(KINDS[0].value);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = KINDS.find((k) => k.value === kind)?.placeholder;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        label: label || KINDS.find((k) => k.value === kind)?.label || kind,
        url,
        sortOrder: Number(sortOrder),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("couldn't save — check the url.");
      return;
    }
    setLabel("");
    setUrl("");
    setSortOrder("0");
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
        gridTemplateColumns: "2fr 1.5fr 2fr 0.6fr auto",
        gap: 10,
        alignItems: "end",
      }}
    >
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>kind</div>
        <select style={input} value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>label (optional)</div>
        <input
          style={input}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="uses kind by default"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>url</div>
        <input
          required
          style={input}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>sort</div>
        <input
          type="number"
          style={input}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </label>
      <button type="submit" disabled={submitting} className="btn">
        {submitting ? "…" : "add"}
      </button>
      {error && (
        <div style={{ gridColumn: "1 / -1", color: "var(--danger)", fontSize: 13 }}>{error}</div>
      )}
    </form>
  );
}
