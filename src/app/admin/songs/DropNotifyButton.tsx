"use client";

import { useState } from "react";

export function DropNotifyButton({ id, title }: { id: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function go() {
    if (
      !confirm(
        `send release notifications for "${title}" now? this emails + pushes every fan who subscribed to this song or to "anything next".`
      )
    )
      return;
    setBusy(true);
    setResult(null);
    const res = await fetch(`/api/admin/songs/${id}/drop-notify`, { method: "POST" });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResult(body.error ?? "failed");
      return;
    }
    setResult(
      `notified ${body.result.notified} · skipped ${body.result.skipped}`
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button onClick={go} disabled={busy} className="btn btn-ghost">
        {busy ? "…" : "notify subscribers"}
      </button>
      {result && (
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{result}</span>
      )}
    </div>
  );
}
