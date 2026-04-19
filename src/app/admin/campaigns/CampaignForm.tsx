"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [multiplier, setMultiplier] = useState("2");
  const [flatBonus, setFlatBonus] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        multiplier: Number(multiplier),
        flatBonus: flatBonus ? Number(flatBonus) : null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create");
      return;
    }
    setName("");
    setFlatBonus("");
    setStartsAt("");
    setEndsAt("");
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1.5fr auto",
        gap: 10,
        alignItems: "end",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Name</div>
        <input
          required
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Double Points Weekend"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Multiplier</div>
        <input
          required
          type="number"
          step="0.25"
          min="1"
          style={inputStyle}
          value={multiplier}
          onChange={(e) => setMultiplier(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Flat bonus (pts)</div>
        <input
          type="number"
          min="0"
          style={inputStyle}
          value={flatBonus}
          onChange={(e) => setFlatBonus(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Starts</div>
        <input
          required
          type="datetime-local"
          style={inputStyle}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Ends</div>
        <input
          required
          type="datetime-local"
          style={inputStyle}
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
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
        {submitting ? "Saving..." : "Create"}
      </button>
      {error && (
        <div style={{ gridColumn: "1 / -1", color: "#ff6b6b", fontSize: 13 }}>{error}</div>
      )}
    </form>
  );
}
