"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GrantForm({ mcUuid, mcUsername }: { mcUuid: string; mcUsername: string }) {
  const router = useRouter();
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const p = Number(points);
    if (!Number.isFinite(p) || p < 1 || p > 5000) {
      setError("points must be between 1 and 5000.");
      return;
    }
    if (!reason.trim()) {
      setError("write a reason — it lands in the audit log.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/minecraft/grant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mcUuid, points: p, reason: reason.trim(), notify }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "didn't save.");
      return;
    }
    const body = await res.json();
    setOk(
      body.idempotent
        ? "already granted (idempotent retry)."
        : `+${p.toLocaleString()} sent to ${mcUsername}.`
    );
    setPoints("");
    setReason("");
    setNotify(false);
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
    <form onSubmit={submit} className="admin-surface" style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 10 }}>
        <label>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>points (1-5000)</div>
          <input
            style={input}
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="250"
          />
        </label>
        <label>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>reason</div>
          <input
            style={input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="won the dusk build contest"
          />
        </label>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        push the fan a note on their phone
      </label>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <button type="submit" disabled={busy} className="btn">
          {busy ? "…" : "grant"}
        </button>
        {ok && <span style={{ color: "var(--success)", fontSize: 13 }}>{ok}</span>}
        {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
      </div>
    </form>
  );
}
