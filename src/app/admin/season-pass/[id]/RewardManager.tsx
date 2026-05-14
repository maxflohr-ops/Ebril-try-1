"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "cosmetic" | "plot" | "title" | "item" | "other";

interface Reward {
  id: string;
  key: string;
  name: string;
  description: string;
  kind: Kind;
  imageUrl: string;
  sortOrder: number;
  minTierSortOrder: number;
  submissionCount: number;
  grantCount: number;
}

const KIND_OPTIONS: Kind[] = ["cosmetic", "plot", "title", "item", "other"];

export function RewardManager({ seasonId, initial }: { seasonId: string; initial: Reward[] }) {
  const router = useRouter();
  const [rewards, setRewards] = useState(initial);
  const [draft, setDraft] = useState({
    key: "",
    name: "",
    description: "",
    kind: "cosmetic" as Kind,
    imageUrl: "",
    sortOrder: rewards.length,
    minTierSortOrder: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.key.trim() || !draft.name.trim() || !draft.description.trim()) {
      setError("key, name, and description are required.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/season-pass/${seasonId}/rewards`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        key: draft.key.trim(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        imageUrl: draft.imageUrl.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error === "duplicate_key" ? "a reward with that key already exists in this season." : "didn't save.");
      return;
    }
    const created = (await res.json()) as Reward;
    setRewards((rs) => [...rs, { ...created, submissionCount: 0, grantCount: 0 }]);
    setDraft({
      key: "",
      name: "",
      description: "",
      kind: "cosmetic",
      imageUrl: "",
      sortOrder: rewards.length + 1,
      minTierSortOrder: 0,
    });
    router.refresh();
  }

  async function removeReward(id: string) {
    if (!confirm("delete this reward? pending submissions and grants for it are also removed.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/season-pass/${seasonId}/rewards/${id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      setRewards((rs) => rs.filter((r) => r.id !== id));
      router.refresh();
    }
  }

  const input: React.CSSProperties = {
    background: "#110D0B",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    width: "100%",
    fontFamily: "inherit",
    fontSize: 13,
  };

  return (
    <div>
      <form
        onSubmit={add}
        className="admin-surface"
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <label style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            key (matches on-season-reward.&lt;key&gt;)
          </div>
          <input
            style={{ ...input, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
            placeholder="dusk_cape"
          />
        </label>
        <label style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>name</div>
          <input
            style={input}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="dusk cape"
          />
        </label>
        <label>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>kind</div>
          <select
            style={input}
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>min tier</div>
          <select
            style={input}
            value={draft.minTierSortOrder}
            onChange={(e) =>
              setDraft({ ...draft, minTierSortOrder: Number(e.target.value) })
            }
          >
            <option value={0}>any</option>
            <option value={1}>fan+</option>
            <option value={2}>superfan+</option>
            <option value={3}>vip</option>
          </select>
        </label>
        <label style={{ gridColumn: "span 4" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>description</div>
          <input
            style={input}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="show me your build for a dusk-inspired room"
          />
        </label>
        <label style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>image url (optional)</div>
          <input
            style={input}
            value={draft.imageUrl}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
          />
        </label>
        <div style={{ gridColumn: "span 6", display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={busy} className="btn">
            {busy ? "…" : "add reward"}
          </button>
          {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
        </div>
      </form>

      {rewards.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>no rewards yet.</p>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {rewards.map((r) => (
          <div
            key={r.id}
            className="admin-surface"
            style={{
              padding: 12,
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto",
              gap: 14,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            {r.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.imageUrl}
                alt=""
                width={48}
                height={48}
                style={{ borderRadius: 8, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "#1A1613",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {r.kind === "cosmetic" ? "✦" : r.kind === "plot" ? "▤" : r.kind === "title" ? "✎" : r.kind === "item" ? "◆" : "·"}
              </div>
            )}
            <div>
              <div>
                <strong>{r.name}</strong>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  }}
                >
                  {r.key}
                </span>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                {r.description}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                {r.kind}
                {r.minTierSortOrder > 0
                  ? ` · ${r.minTierSortOrder === 1 ? "fan+" : r.minTierSortOrder === 2 ? "superfan+" : "vip"}`
                  : ""}
                {" "}· {r.submissionCount} submissions · {r.grantCount} granted
              </div>
            </div>
            <div></div>
            <button
              type="button"
              onClick={() => removeReward(r.id)}
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
              disabled={busy}
            >
              delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
