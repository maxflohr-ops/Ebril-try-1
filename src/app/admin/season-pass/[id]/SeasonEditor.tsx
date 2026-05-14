"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Initial {
  name: string;
  tagline: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export function SeasonEditor({ id, initial }: { id: string; initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const [active, setActive] = useState(initial.active);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(false);
    const res = await fetch(`/api/admin/season-pass/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        tagline: tagline.trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        active,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("didn't save.");
      return;
    }
    setOk(true);
    router.refresh();
    setTimeout(() => setOk(false), 1500);
  }

  async function remove() {
    if (!confirm("delete this season and all of its rewards + submissions? this cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/season-pass/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/admin/season-pass");
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
    <form onSubmit={save} className="admin-surface" style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>name</div>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        live
      </label>
      <div></div>
      <label style={{ gridColumn: "span 4" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tagline</div>
        <input style={input} value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>starts</div>
        <input type="datetime-local" style={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ends</div>
        <input type="datetime-local" style={input} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </label>
      <div style={{ gridColumn: "span 4", display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={busy} className="btn">
          {busy ? "…" : "save"}
        </button>
        <button type="button" onClick={remove} disabled={busy} className="btn btn-ghost" style={{ marginLeft: "auto" }}>
          delete season
        </button>
        {ok && <span style={{ color: "var(--success)", fontSize: 13 }}>saved.</span>}
        {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
      </div>
    </form>
  );
}
