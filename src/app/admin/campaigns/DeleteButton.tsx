"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this campaign?")) return;
    setPending(true);
    const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) router.refresh();
    else alert("Delete failed");
  }

  return (
    <button
      onClick={onDelete}
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
      {pending ? "..." : "Delete"}
    </button>
  );
}
