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
      setError(body.error ?? "didn't land. try again.");
      return;
    }
    setSaved(true);
  }

  return (
    <form
      onSubmit={submit}
      className="surface"
      style={{ padding: 20 }}
    >
      <div className="eyebrow" style={{ marginBottom: 14 }}>account</div>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 10 }}>name</div>
          <div style={{ fontSize: 15, marginTop: 4 }}>
            {displayName?.toLowerCase() ?? "—"}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ fontSize: 10 }}>email</div>
          <div style={{ fontSize: 15, marginTop: 4 }}>{email ?? "—"}</div>
        </div>
        <label>
          <div className="eyebrow" style={{ fontSize: 10 }}>your birthday</div>
          <input
            type="date"
            className="input"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            style={{ marginTop: 6 }}
          />
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 12,
              marginTop: 6,
            }}
          >
            a little something lands on the day. that&rsquo;s it.
          </div>
        </label>
      </div>
      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={saving} className="btn">
          {saving ? "…" : "save"}
        </button>
        {saved && <div style={{ color: "var(--success)", fontSize: 13 }}>saved.</div>}
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
