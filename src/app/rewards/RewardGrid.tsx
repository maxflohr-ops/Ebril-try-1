"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Reward {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  costPoints: number;
  stock: number | null;
  type: string;
  tierRequired: { name: string; sortOrder: number } | null;
  affordable: boolean;
  tierUnlocked: boolean;
}

const DIGITAL = new Set(["content_unlock", "discount_code"]);

export function RewardGrid({ rewards }: { rewards: Reward[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function redeem(reward: Reward) {
    setError(null);
    let shippingAddress: Record<string, string> | undefined;
    if (!DIGITAL.has(reward.type)) {
      const name = prompt("Shipping name");
      if (!name) return;
      const line1 = prompt("Address line 1");
      if (!line1) return;
      const city = prompt("City");
      if (!city) return;
      const region = prompt("State/Region");
      if (!region) return;
      const postalCode = prompt("Postal code");
      if (!postalCode) return;
      const country = prompt("Country (2-letter code, e.g. US)");
      if (!country || country.length !== 2) return;
      shippingAddress = { name, line1, city, region, postalCode, country: country.toUpperCase() };
    }

    setBusyId(reward.id);
    const res = await fetch("/api/redemptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rewardId: reward.id, shippingAddress }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed");
      return;
    }
    router.refresh();
    router.push("/redemptions");
  }

  return (
    <>
      {error && (
        <div style={{ marginTop: 16, color: "#ff6b6b" }}>Error: {error}</div>
      )}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {rewards.map((r) => {
          const disabled = !r.affordable || !r.tierUnlocked || r.stock === 0;
          const reason = !r.tierUnlocked
            ? `Unlocks at ${r.tierRequired?.name}`
            : !r.affordable
              ? "Not enough points"
              : r.stock === 0
                ? "Out of stock"
                : null;
          return (
            <div
              key={r.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {r.imageUrl && (
                <img
                  src={r.imageUrl}
                  alt=""
                  style={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              )}
              <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4, flex: 1 }}>
                  {r.description}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>{r.costPoints.toLocaleString()} pts</strong>
                  <button
                    disabled={disabled || busyId === r.id}
                    onClick={() => redeem(r)}
                    style={{
                      background: disabled
                        ? "var(--border)"
                        : "linear-gradient(135deg, var(--accent), var(--accent-2))",
                      color: "white",
                      border: 0,
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {busyId === r.id ? "..." : "Redeem"}
                  </button>
                </div>
                {reason && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    {reason}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
