"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeasonForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !startsAt || !endsAt) {
      setError("name + start + end are required.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/season-pass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim() || undefined,
        tagline: tagline.trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        active,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "didn't save.");
      return;
    }
    setName("");
    setSlug("");
    setTagline("");
    setStartsAt("");
    setEndsAt("");
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
      style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}
    >
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>name</div>
        <input
          style={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="dusk season"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>slug (optional)</div>
        <input
          style={input}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="dusk-2026"
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        make live
      </label>
      <label style={{ gridColumn: "span 4" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tagline</div>
        <input
          style={input}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="claim a piece of the world this season"
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>starts</div>
        <input
          type="datetime-local"
          style={input}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ends</div>
        <input
          type="datetime-local"
          style={input}
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
      </label>
      <div style={{ gridColumn: "span 4", display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={busy} className="btn">
          {busy ? "…" : "create season"}
        </button>
        {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
      </div>
    </form>
  );
}
