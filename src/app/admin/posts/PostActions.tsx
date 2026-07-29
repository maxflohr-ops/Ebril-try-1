"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PostActions({
  id,
  pinned,
  active,
}: {
  id: string;
  pinned: boolean;
  active: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function togglePin() {
    setBusy(true);
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function archive() {
    if (!confirm("archive this moment? fans stop seeing it.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {active && (
        <button onClick={togglePin} disabled={busy} className="btn btn-ghost">
          {pinned ? "unpin" : "pin"}
        </button>
      )}
      {active && (
        <button onClick={archive} disabled={busy} className="btn btn-ghost">
          archive
        </button>
      )}
    </div>
  );
}
