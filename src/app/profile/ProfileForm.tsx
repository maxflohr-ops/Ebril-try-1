"use client";

import { useState } from "react";

interface Props {
  initialDob: string;
  email: string | null;
  displayName: string | null;
}

export function ProfileForm({ initialDob, email, displayName }: Props) {
  const [dob, setDob] = useState(initialDob);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dob: dob || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    setSaved(true);
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
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Display name</div>
          <div style={{ fontSize: 14 }}>{displayName ?? "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Email</div>
          <div style={{ fontSize: 14 }}>{email ?? "—"}</div>
        </div>
        <label>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Date of birth (for the birthday bonus)
          </div>
          <input type="date" style={input} value={dob} onChange={(e) => setDob(e.target.value)} />
        </label>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="submit"
          disabled={saving}
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
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <div style={{ color: "var(--text-muted)" }}>Saved.</div>}
        {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
      </div>
    </form>
  );
}
