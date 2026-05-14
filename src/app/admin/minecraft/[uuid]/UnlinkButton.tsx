"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnlinkButton({ mcUuid }: { mcUuid: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!confirm("force-unlink this minecraft account? the fan keeps their copula points but loses in-game tier sync.")) return;
    setBusy(true);
    const res = await fetch("/api/admin/minecraft/unlink", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mcUuid }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/admin/minecraft");
      router.refresh();
    } else {
      alert("didn't unlink.");
    }
  }

  return (
    <button onClick={go} disabled={busy} className="btn btn-ghost" style={{ fontSize: 12 }}>
      {busy ? "…" : "force-unlink"}
    </button>
  );
}
