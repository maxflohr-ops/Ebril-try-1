"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["merch", "signed", "call_1on1", "content_unlock", "discount_code"] as const;

export function RewardForm({ tiers }: { tiers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [costPoints, setCostPoints] = useState("1000");
  const [type, setType] = useState<(typeof TYPES)[number]>("merch");
  const [imageUrl, setImageUrl] = useState("");
  const [stock, setStock] = useState("");
  const [tierRequiredId, setTierRequiredId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/rewards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        costPoints: Number(costPoints),
        type,
        imageUrl: imageUrl || null,
        stock: stock === "" ? null : Number(stock),
        tierRequiredId: tierRequiredId || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed");
      return;
    }
    setName("");
    setDescription("");
    setImageUrl("");
    setStock("");
    setTierRequiredId("");
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
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
      }}
    >
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Name</div>
        <input required style={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Type</div>
        <select style={input} value={type} onChange={(e) => setType(e.target.value as never)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Description</div>
        <textarea
          style={{ ...input, minHeight: 60 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Cost (pts)</div>
        <input
          required
          type="number"
          min="1"
          style={input}
          value={costPoints}
          onChange={(e) => setCostPoints(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Stock (blank = unlimited)</div>
        <input
          type="number"
          min="0"
          style={input}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Tier required</div>
        <select
          style={input}
          value={tierRequiredId}
          onChange={(e) => setTierRequiredId(e.target.value)}
        >
          <option value="">None</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Image URL</div>
        <input
          style={input}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <div style={{ gridColumn: "span 3", display: "flex", gap: 12, alignItems: "center" }}>
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
          {submitting ? "Saving..." : "Add reward"}
        </button>
        {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
      </div>
    </form>
  );
}
