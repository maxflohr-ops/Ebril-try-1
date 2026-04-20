"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("delete this link?")) return;
    setPending(true);
    const res = await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <button onClick={onClick} disabled={pending} className="btn btn-ghost">
      {pending ? "…" : "delete"}
    </button>
  );
}
