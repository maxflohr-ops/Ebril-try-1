"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "cosmetic" | "plot" | "title" | "item" | "other";
type Status = "pending" | "approved" | "rejected";
type ContentType = "url" | "text";

interface Reward {
  id: string;
  key: string;
  name: string;
  description: string;
  kind: Kind;
  imageUrl: string | null;
  minTierSortOrder: number;
  granted: boolean;
  submission: {
    id: string;
    status: Status;
    contentType: ContentType;
    contentBody: string;
    reviewerNote: string | null;
    createdAt: string;
  } | null;
}

function kindGlyph(kind: Kind) {
  return kind === "cosmetic"
    ? "✦"
    : kind === "plot"
      ? "▤"
      : kind === "title"
        ? "✎"
        : kind === "item"
          ? "◆"
          : "·";
}

function tierLabel(min: number) {
  if (min <= 0) return null;
  if (min === 1) return "fan+";
  if (min === 2) return "superfan+";
  return "vip";
}

export function SeasonPassGrid({
  rewards,
  currentTierSortOrder,
}: {
  rewards: Reward[];
  currentTierSortOrder: number;
}) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {rewards.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          no rewards in this season yet.
        </p>
      )}
      {rewards.map((r) => (
        <RewardCard
          key={r.id}
          reward={r}
          locked={r.minTierSortOrder > currentTierSortOrder}
        />
      ))}
    </div>
  );
}

function RewardCard({ reward, locked }: { reward: Reward; locked: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>("url");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sub = reward.submission;
  const tier = tierLabel(reward.minTierSortOrder);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("write something first.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/season-pass/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rewardId: reward.id,
        contentType,
        contentBody: body.trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        data.error === "submission_pending"
          ? "you already have a submission for this in review."
          : data.error === "already_granted"
            ? "you've already earned this one."
            : data.error === "tier_too_low"
              ? "this one is for higher-tier supporters."
              : data.error === "bad_url"
                ? "that link looks off — try a public link to your build / clip."
                : data.error === "season_not_active"
                  ? "season already closed."
                  : "couldn't submit. try again in a sec.";
      setError(msg);
      return;
    }
    setOpen(false);
    setBody("");
    router.refresh();
  }

  // Cards have four states:
  // 1) granted — sealed celebratory card
  // 2) submission pending — in review
  // 3) submission rejected — see note, can resubmit
  // 4) no submission — show "claim this" button
  const state: "granted" | "pending" | "rejected" | "open" = reward.granted
    ? "granted"
    : sub?.status === "pending"
      ? "pending"
      : sub?.status === "rejected"
        ? "rejected"
        : "open";

  const accent =
    state === "granted"
      ? "rgba(139,168,136,0.4)"
      : state === "pending"
        ? "rgba(216,155,122,0.35)"
        : state === "rejected"
          ? "rgba(180,90,100,0.35)"
          : "var(--border)";

  return (
    <div
      className="surface"
      style={{
        padding: 0,
        borderColor: accent,
        overflow: "hidden",
        opacity: locked ? 0.55 : 1,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "112px 1fr", gap: 0 }}>
        <div
          style={{
            background: reward.imageUrl
              ? `center/cover no-repeat url(${reward.imageUrl})`
              : "linear-gradient(160deg, #1E1815, #100B09)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            color: "var(--accent)",
          }}
        >
          {!reward.imageUrl && kindGlyph(reward.kind)}
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div className="serif" style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.25 }}>
              {reward.name.toLowerCase()}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {reward.kind}{tier ? ` · ${tier}` : ""}
            </div>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
            {reward.description}
          </div>

          {state === "granted" && (
            <div style={{ marginTop: 10, color: "var(--success)", fontSize: 13 }}>
              ✓ earned. log into the server to claim it in-game.
            </div>
          )}

          {state === "pending" && sub && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--accent)" }}>
              in review · submitted {new Date(sub.createdAt).toISOString().slice(0, 10)}
            </div>
          )}

          {state === "rejected" && sub && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <span style={{ color: "var(--danger)" }}>returned.</span>
              {sub.reviewerNote && (
                <span style={{ color: "var(--text-muted)" }}> — {sub.reviewerNote}</span>
              )}
            </div>
          )}

          {locked && (
            <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 12 }}>
              unlocks at {tier}.
            </div>
          )}

          {!locked && state !== "granted" && state !== "pending" && !open && (
            <button
              onClick={() => setOpen(true)}
              className="btn"
              style={{ marginTop: 12, fontSize: 13, padding: "6px 14px" }}
            >
              {state === "rejected" ? "submit again" : "submit content to claim"}
            </button>
          )}

          {open && (
            <form onSubmit={submit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <TypeTab
                  active={contentType === "url"}
                  onClick={() => setContentType("url")}
                  label="link"
                />
                <TypeTab
                  active={contentType === "text"}
                  onClick={() => setContentType("text")}
                  label="write"
                />
              </div>
              {contentType === "url" ? (
                <input
                  type="url"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="https://… link to your build screenshot, clip, or post"
                  style={inputStyle}
                />
              ) : (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="tell ebril what you made and where to find it in-game…"
                  style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.55 }}
                />
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button type="submit" disabled={busy} className="btn">
                  {busy ? "…" : "send for review"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="btn btn-ghost"
                >
                  cancel
                </button>
                {error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 12px",
        fontSize: 12,
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "white" : "var(--text-muted)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#110D0B",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  width: "100%",
  fontFamily: "inherit",
  fontSize: 14,
};
