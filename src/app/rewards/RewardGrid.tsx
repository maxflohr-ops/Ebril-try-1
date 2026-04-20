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
  shortfall: number;
}

const DIGITAL = new Set(["content_unlock", "discount_code"]);

type ToastKind = "info" | "success" | "error";
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

export function RewardGrid({ rewards }: { rewards: Reward[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(kind: ToastKind, text: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }

  function collectShipping(reward: Reward): Record<string, string> | null | undefined {
    if (DIGITAL.has(reward.type)) return undefined;
    const name = prompt("shipping name");
    if (!name) return null;
    const line1 = prompt("address line 1");
    if (!line1) return null;
    const city = prompt("city");
    if (!city) return null;
    const region = prompt("state or region");
    if (!region) return null;
    const postalCode = prompt("postal code");
    if (!postalCode) return null;
    const country = prompt("country (2-letter code, e.g. us)");
    if (!country || country.length !== 2) return null;
    return {
      name,
      line1,
      city,
      region,
      postalCode,
      country: country.toUpperCase(),
    };
  }

  async function redeem(reward: Reward) {
    if (!reward.tierUnlocked) {
      pushToast("info", `this one opens at ${reward.tierRequired?.name.toLowerCase()}.`);
      return;
    }
    if (!reward.affordable) {
      pushToast(
        "info",
        `you're ${reward.shortfall.toLocaleString()} points away — almost.`
      );
      return;
    }
    if (reward.stock === 0) {
      pushToast("info", "this one's gone for now. i'll bring more back.");
      return;
    }

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
      pushToast("error", friendlyError(body.error));
      return;
    }
    pushToast("success", "got it — keeping it safe for you.");
    router.refresh();
    setTimeout(() => router.push("/redemptions"), 900);
  }

  async function buyCash(reward: Reward) {
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
      pushToast("error", friendlyError(body.error));
      setBusyId(null);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {rewards.map((r) => {
          const locked = !r.tierUnlocked;
          const oos = r.stock === 0;
          const dim = locked || !r.affordable || oos;
          return (
            <div
              key={r.id}
              className="surface"
              style={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                opacity: dim ? 0.55 : 1,
                transition: "opacity 200ms var(--ease), transform 200ms var(--ease)",
              }}
            >
              {r.imageUrl ? (
                <div style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.imageUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      filter: dim ? "grayscale(60%)" : "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(21,16,14,0) 50%, rgba(21,16,14,0.7) 100%)",
                      mixBlendMode: "multiply",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: 120,
                    background:
                      "linear-gradient(135deg, rgba(107,74,94,0.4), rgba(216,155,122,0.15))",
                  }}
                />
              )}
              <div
                style={{
                  padding: 18,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  className="serif"
                  style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.25 }}
                >
                  {r.name}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, flex: 1 }}>
                  {r.description}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    className={locked || oos ? "chip chip-danger" : "chip"}
                  >
                    {locked
                      ? r.tierRequired?.name.toLowerCase()
                      : oos
                        ? "rested"
                        : `${r.costPoints.toLocaleString()} pts`}
                  </span>
                  <button
                    className="btn"
                    disabled={busyId === r.id}
                    onClick={() => redeem(r)}
                  >
                    {busyId === r.id ? "…" : "redeem"}
                  </button>
                </div>
                {r.cashPriceCents && !locked && !oos && (
                  <button
                    className="btn btn-ghost"
                    disabled={busyId === r.id}
                    onClick={() => buyCash(r)}
                    style={{ width: "100%" }}
                  >
                    or take it for ${(r.cashPriceCents / 100).toFixed(2)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {toasts.map((t, i) => (
        <div
          key={t.id}
          className={`toast ${t.kind === "success" ? "success" : t.kind === "error" ? "error" : ""}`}
          style={{ bottom: 24 + i * 56 }}
        >
          {t.text}
        </div>
      ))}
    </>
  );
}

function friendlyError(code?: string): string {
  switch (code) {
    case "insufficient_points":
      return "not quite enough yet — keep going.";
    case "tier_locked":
      return "this one opens at a higher tier.";
    case "out_of_stock":
      return "this one's gone for now. i'll bring more back.";
    case "shipping_required":
      return "need a shipping address for this one.";
    case "reward_unavailable":
      return "this reward is resting right now.";
    default:
      return "something didn't land. try again in a minute.";
  }
}
