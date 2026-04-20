"use client";

import { useState } from "react";

interface Pack {
  id: string;
  name: string;
  points: number;
  priceCents: number;
  currency: string;
}

export function PackGrid({ packs }: { packs: Pack[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(id: string) {
    setBusy(id);
    setError(null);
    const res = await fetch("/api/checkout/point-pack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packId: id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Checkout failed");
      setBusy(null);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  if (packs.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No packs available right now.</p>;
  }

  return (
    <>
      {error && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>{error}</div>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {packs.map((p) => (
          <div
            key={p.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>
              {p.points.toLocaleString()}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>points</div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>
                ${(p.priceCents / 100).toFixed(2)} {p.currency}
              </strong>
              <button
                disabled={busy !== null}
                onClick={() => buy(p.id)}
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontWeight: 700,
                  cursor: busy ? "wait" : "pointer",
                }}
              >
                {busy === p.id ? "..." : "Buy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
