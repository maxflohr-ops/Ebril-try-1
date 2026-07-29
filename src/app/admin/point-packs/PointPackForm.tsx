"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PointPackForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [points, setPoints] = useState("1000");
  const [priceCents, setPriceCents] = useState("1000");
  const [sortOrder, setSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/point-packs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        points: Number(points),
        priceCents: Number(priceCents),
        sortOrder: Number(sortOrder),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed");
      return;
    }
    setName("");
    setPoints("1000");
    setPriceCents("1000");
    setSortOrder("0");
    router.refresh();
  }

  const input: React.CSSProperties = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    width: "100%",
  };

  return (
    <form
      onSubmit={submit}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
        gap: 10,
        alignItems: "end",
      }}
    >
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Name</div>
        <input required style={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Points</div>
        <input
          required
          type="number"
          min="1"
          style={input}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Price (cents)</div>
        <input
          required
          type="number"
          min="50"
          style={input}
          value={priceCents}
          onChange={(e) => setPriceCents(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Sort</div>
        <input
          type="number"
          style={input}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          color: "white",
          border: 0,
          borderRadius: 8,
          padding: "10px 16px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {submitting ? "..." : "Add"}
      </button>
      {error && (
        <div style={{ gridColumn: "1 / -1", color: "#ff6b6b" }}>{error}</div>
      )}
    </form>
  );
}
