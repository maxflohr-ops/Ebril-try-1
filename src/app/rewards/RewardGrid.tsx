"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Reward {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  costPoints: number;
  cashPriceCents: number | null;
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

  function collectShipping(reward: Reward): Record<string, string> | null | undefined {
    if (DIGITAL.has(reward.type)) return undefined;
    const name = prompt("Shipping name");
    if (!name) return null;
    const line1 = prompt("Address line 1");
    if (!line1) return null;
    const city = prompt("City");
    if (!city) return null;
    const region = prompt("State/Region");
    if (!region) return null;
    const postalCode = prompt("Postal code");
    if (!postalCode) return null;
    const country = prompt("Country (2-letter code, e.g. US)");
    if (!country || country.length !== 2) return null;
    return { name, line1, city, region, postalCode, country: country.toUpperCase() };
  }

  async function redeem(reward: Reward) {
    setError(null);
    const shippingAddress = collectShipping(reward);
    if (shippingAddress === null) return;

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

  async function buyCash(reward: Reward) {
    setError(null);
    const shippingAddress = collectShipping(reward);
    if (shippingAddress === null) return;

    setBusyId(reward.id);
    const res = await fetch("/api/checkout/reward", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rewardId: reward.id, shippingAddress }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed");
      setBusyId(null);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
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
                {r.cashPriceCents && r.tierUnlocked && r.stock !== 0 && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => buyCash(r)}
                    style={{
                      marginTop: 8,
                      background: "transparent",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Or buy for ${(r.cashPriceCents / 100).toFixed(2)}
                  </button>
                )}
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
