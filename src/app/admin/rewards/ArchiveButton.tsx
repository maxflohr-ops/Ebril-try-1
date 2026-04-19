"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("Archive this reward? Fans won't see it anymore.")) return;
    setPending(true);
    const res = await fetch(`/api/admin/rewards/${id}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      style={{
        background: "transparent",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
      }}
    >
      {pending ? "..." : "Archive"}
    </button>
  );
}
