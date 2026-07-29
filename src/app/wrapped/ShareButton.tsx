"use client";

import { useState } from "react";

export function ShareButton({ text }: { text: string }) {
  const [done, setDone] = useState<"copied" | "shared" | null>(null);

  async function share() {
    const payload = {
      title: "copula · my week",
      text,
      url: typeof window !== "undefined" ? window.location.origin + "/wrapped" : undefined,
    };
    // Prefer the native share sheet on mobile; fall back to clipboard
    // on desktop or when the user dismisses permission prompts.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        setDone("shared");
        setTimeout(() => setDone(null), 2000);
        return;
      } catch {
        // ignore — user probably dismissed the sheet.
      }
    }
    try {
      await navigator.clipboard.writeText(
        `${text}${payload.url ? `\n${payload.url}` : ""}`
      );
      setDone("copied");
      setTimeout(() => setDone(null), 2000);
    } catch {
      // no-op — nothing useful to show if clipboard is blocked.
    }
  }

  return (
    <button type="button" onClick={share} className="btn">
      {done === "copied" ? "copied" : done === "shared" ? "shared" : "share the week"}
    </button>
  );
}
