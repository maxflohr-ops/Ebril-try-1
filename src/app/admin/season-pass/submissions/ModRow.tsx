"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  status: string;
  contentType: string;
  contentBody: string;
  createdAt: string;
  decidedAt: string | null;
  reviewerNote: string | null;
  fan: {
    id: string;
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
  reward: {
    name: string;
    key: string;
    kind: string;
    season: string;
  };
}

export function ModRow(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(props.reviewerNote ?? "");
  const [status, setStatus] = useState(props.status);

  async function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && !note.trim()) {
      if (!confirm("reject without a note? the fan will see no reason.")) return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/season-pass/submissions/${props.id}/decide`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, reviewerNote: note.trim() || null }),
    });
    setBusy(false);
    if (res.ok) {
      setStatus(decision);
      router.refresh();
    } else {
      alert("didn't save.");
    }
  }

  const isUrl = props.contentType === "url";
  const fanName = props.fan?.displayName?.toLowerCase() ?? props.fan?.email ?? "someone";

  return (
    <div
      className="admin-surface"
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 14,
        opacity: status === "pending" ? 1 : 0.6,
      }}
    >
      {props.fan?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.fan.avatarUrl}
          alt=""
          width={40}
          height={40}
          style={{ borderRadius: 999 }}
        />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: 999, background: "#1A1613" }} />
      )}
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 14 }}>{fanName}</strong>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>wants</span>
          <span style={{ fontSize: 14 }}>{props.reward.name}</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            {props.reward.key} · {props.reward.kind} · {props.reward.season}
          </span>
        </div>

        <div
          style={{
            marginTop: 10,
            padding: 12,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {isUrl ? (
            <a
              href={props.contentBody}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", wordBreak: "break-all" }}
            >
              {props.contentBody} ↗
            </a>
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{props.contentBody}</span>
          )}
        </div>

        <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 11 }}>
          submitted {new Date(props.createdAt).toISOString().slice(0, 16).replace("T", " ")}
          {props.decidedAt &&
            ` · decided ${new Date(props.decidedAt).toISOString().slice(0, 16).replace("T", " ")}`}
        </div>

        {status === "pending" && (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="optional note to the fan (especially on rejects)"
              style={{
                background: "#110D0B",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                width: "100%",
                fontFamily: "inherit",
                fontSize: 13,
                minHeight: 50,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => decide("approved")}
                disabled={busy}
                className="btn"
                style={{ background: "var(--success, #6B8A5A)" }}
              >
                {busy ? "…" : "approve"}
              </button>
              <button
                onClick={() => decide("rejected")}
                disabled={busy}
                className="btn btn-ghost"
              >
                return
              </button>
            </div>
          </div>
        )}
        {status !== "pending" && (
          <div style={{ marginTop: 8, fontSize: 12, color: status === "approved" ? "var(--success)" : "var(--danger)" }}>
            {status === "approved" ? "approved" : "returned"}
            {props.reviewerNote && (
              <span style={{ color: "var(--text-muted)" }}> — {props.reviewerNote}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
