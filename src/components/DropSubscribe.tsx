"use client";

import { useState } from "react";

export function DropSubscribe({
  songId,
  label,
  initialSubscribed = false,
}: {
  songId: string | null;
  label?: string;
  initialSubscribed?: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    if (subscribed) {
      const qs = new URLSearchParams();
      if (songId) qs.set("songId", songId);
      await fetch(`/api/drops${qs.toString() ? `?${qs.toString()}` : ""}`, {
        method: "DELETE",
      });
      setSubscribed(false);
    } else {
      const res = await fetch("/api/drops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ songId, label: label ?? null }),
      });
      if (res.ok) setSubscribed(true);
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={subscribed ? "btn btn-ghost" : "btn"}
      style={{ textDecoration: "none" }}
    >
      {busy
        ? "…"
        : subscribed
          ? "you'll know when it drops"
          : songId
            ? "notify me for the next one"
            : "tell me when the next song lands"}
    </button>
  );
}
