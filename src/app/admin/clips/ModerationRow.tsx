"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Fan {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface Brief {
  title: string;
  era: string;
  accent: string;
  pointsApproved: number;
  pointsFeatured: number;
  pointsViral: number;
}

interface Props {
  id: string;
  url: string;
  platform: string;
  caption: string | null;
  status: string;
  viewCount: number;
  pointsAwarded: number;
  adminNotes: string | null;
  rejectedReason: string | null;
  urlStatus: string | null;
  urlStatusCode: number | null;
  urlCheckedAt: string | null;
  createdAt: string;
  brief: Brief;
  fan: Fan | null;
}

function URL_CHIP(status: string | null): {
  label: string;
  cls: string;
  note: string;
} {
  if (status === "ok") return { label: "live", cls: "chip chip-success", note: "200 ok" };
  if (status === "unreachable")
    return { label: "gone", cls: "chip chip-danger", note: "didn't respond" };
  return { label: "unknown", cls: "chip", note: "platform blocked the bot — confirm by eye" };
}

export function ModerationRow(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(props.adminNotes ?? "");
  const [reason, setReason] = useState(props.rejectedReason ?? "");
  const [views, setViews] = useState(String(props.viewCount));
  const [error, setError] = useState<string | null>(null);

  async function move(next: string) {
    setBusy(next);
    setError(null);
    const res = await fetch(`/api/admin/clips/${props.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: next,
        adminNotes: notes || null,
        rejectedReason: next === "rejected" ? reason || null : null,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      setError("didn't save.");
      return;
    }
    router.refresh();
  }

  async function saveViews() {
    setBusy("views");
    setError(null);
    const res = await fetch(`/api/admin/clips/${props.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ viewCount: Number(views) }),
    });
    setBusy(null);
    if (!res.ok) setError("didn't save views.");
    else router.refresh();
  }

  const actions =
    props.status === "pending"
      ? [
          { next: "approved", label: `keep · +${props.brief.pointsApproved}` },
          { next: "featured", label: `hold · +${props.brief.pointsFeatured}` },
          { next: "rejected", label: "return" },
        ]
      : props.status === "approved"
        ? [
            { next: "featured", label: `hold · +${props.brief.pointsFeatured - props.pointsAwarded}` },
            { next: "viral", label: `carry · +${props.brief.pointsViral - props.pointsAwarded}` },
            { next: "rejected", label: "return" },
          ]
        : props.status === "featured"
          ? [
              { next: "viral", label: `carry · +${props.brief.pointsViral - props.pointsAwarded}` },
              { next: "approved", label: "walk back to kept" },
            ]
          : props.status === "viral"
            ? [{ next: "featured", label: "walk back to held" }]
            : props.status === "rejected"
              ? [{ next: "pending", label: "reopen" }]
              : [];

  return (
    <article
      className="admin-surface"
      style={{
        padding: 18,
        marginBottom: 14,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 18,
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            color: "var(--text-muted)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: props.brief.accent }}>{props.brief.era.toLowerCase()}</span>
          <span>·</span>
          <span>{props.platform.replace(/_/g, " ")}</span>
          <span>·</span>
          <span>{props.createdAt.slice(0, 10)}</span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 18,
            fontWeight: 500,
            marginTop: 6,
          }}
        >
          {props.brief.title}
        </div>
        <a
          href={props.url}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            display: "inline-block",
            marginTop: 6,
            color: "var(--accent)",
            fontSize: 13,
            wordBreak: "break-all",
          }}
        >
          watch ↗ {props.url}
        </a>
        {(() => {
          const chip = URL_CHIP(props.urlStatus);
          return (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span className={chip.cls}>{chip.label}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {chip.note}
                {props.urlStatusCode ? ` · ${props.urlStatusCode}` : ""}
                {props.urlCheckedAt
                  ? ` · ${new Date(props.urlCheckedAt).toISOString().slice(0, 16).replace("T", " ")}`
                  : ""}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/admin/clips/${props.id}/recheck`, {
                    method: "POST",
                  });
                  if (res.ok) router.refresh();
                }}
                className="btn btn-ghost"
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                recheck
              </button>
            </div>
          );
        })()}
        {props.caption && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 13,
              marginTop: 8,
              fontStyle: "italic",
            }}
          >
            {props.caption}
          </div>
        )}
        {props.fan && (
          <div
            style={{
              marginTop: 10,
              color: "var(--text-muted)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {props.fan.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={props.fan.avatarUrl}
                alt=""
                width={22}
                height={22}
                style={{ borderRadius: 999 }}
              />
            )}
            {props.fan.displayName ?? props.fan.email}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            notes to self
          </div>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              background: "#110D0B",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              fontFamily: "inherit",
              resize: "vertical",
              fontSize: 13,
            }}
          />
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            min="0"
            value={views}
            onChange={(e) => setViews(e.target.value)}
            style={{
              flex: 1,
              background: "#110D0B",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 10px",
              fontFamily: "inherit",
              fontSize: 13,
            }}
            placeholder="views"
          />
          <button
            type="button"
            onClick={saveViews}
            disabled={busy !== null}
            className="btn btn-ghost"
            style={{ padding: "6px 12px", fontSize: 13 }}
          >
            save views
          </button>
        </div>
        {props.status === "pending" || actions.some((a) => a.next === "rejected") ? (
          <label>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              reason if returning (reaches the fan)
            </div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                background: "#110D0B",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            />
          </label>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {actions.map((a) => (
            <button
              key={a.next}
              onClick={() => move(a.next)}
              disabled={busy !== null}
              className={a.next === "rejected" ? "btn btn-ghost" : "btn"}
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              {busy === a.next ? "…" : a.label}
            </button>
          ))}
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: "auto" }}>
          awarded so far: {props.pointsAwarded.toLocaleString()} pts
        </div>
      </div>
    </article>
  );
}
