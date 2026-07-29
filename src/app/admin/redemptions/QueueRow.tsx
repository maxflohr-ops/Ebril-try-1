"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  status: string;
  rewardName: string;
  rewardType: string;
  costPoints: number;
  userName: string | null;
  userEmail: string | null;
  shippingAddress: Record<string, string> | null;
  createdAt: string;
  notes: string | null;
}

const NEXT_STATUS: Record<string, { next: string; label: string }[]> = {
  pending: [
    { next: "approved", label: "Approve" },
    { next: "cancelled", label: "Cancel + refund" },
  ],
  approved: [
    { next: "shipped", label: "Mark shipped" },
    { next: "cancelled", label: "Cancel + refund" },
  ],
  shipped: [{ next: "delivered", label: "Mark delivered" }],
  delivered: [],
  cancelled: [],
};

export function QueueRow(props: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(props.notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transition(next: string) {
    setBusy(next);
    setError(null);
    const res = await fetch(`/api/admin/redemptions/${props.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next, fulfillmentNotes: notes || undefined }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed");
      return;
    }
    router.refresh();
  }

  const actions = NEXT_STATUS[props.status] ?? [];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{props.rewardName}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {props.rewardType} · {props.costPoints.toLocaleString()} pts ·{" "}
            {props.createdAt.slice(0, 10)}
          </div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            {props.userName ?? "(no name)"}{" "}
            {props.userEmail && (
              <span style={{ color: "var(--text-muted)" }}>· {props.userEmail}</span>
            )}
          </div>
        </div>
        {props.shippingAddress && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            <div>{props.shippingAddress.name}</div>
            <div>{props.shippingAddress.line1}</div>
            {props.shippingAddress.line2 && <div>{props.shippingAddress.line2}</div>}
            <div>
              {props.shippingAddress.city}, {props.shippingAddress.region}{" "}
              {props.shippingAddress.postalCode}
            </div>
            <div>{props.shippingAddress.country}</div>
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <textarea
            placeholder="Fulfillment notes (tracking number, unlock code, etc.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              minHeight: 44,
              background: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 8,
            }}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            {actions.map((a) => (
              <button
                key={a.next}
                disabled={busy !== null}
                onClick={() => transition(a.next)}
                style={{
                  background:
                    a.next === "cancelled"
                      ? "transparent"
                      : "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  color: a.next === "cancelled" ? "var(--text-muted)" : "white",
                  border:
                    a.next === "cancelled"
                      ? "1px solid var(--border)"
                      : "0",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {busy === a.next ? "..." : a.label}
              </button>
            ))}
          </div>
          {error && <div style={{ color: "#ff6b6b", marginTop: 6 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
