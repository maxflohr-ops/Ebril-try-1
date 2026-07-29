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
      setError("couldn't open checkout. try again in a minute.");
      setBusy(null);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  if (packs.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        no packs live right now. check back soon.
      </p>
    );
  }

  return (
    <>
      {error && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {packs.map((p) => (
          <div key={p.id} className="surface" style={{ padding: 22 }}>
            <div className="eyebrow">{p.name.toLowerCase()}</div>
            <div
              className="serif"
              style={{
                fontSize: 44,
                fontWeight: 500,
                color: "var(--accent)",
                marginTop: 10,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {p.points.toLocaleString()}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              points
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 15 }}>
                ${(p.priceCents / 100).toFixed(2)}
                <span style={{ color: "var(--text-muted)", marginLeft: 4, fontSize: 12 }}>
                  {p.currency.toLowerCase()}
                </span>
              </span>
              <button
                className="btn"
                disabled={busy !== null}
                onClick={() => buy(p.id)}
              >
                {busy === p.id ? "…" : "take it"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
