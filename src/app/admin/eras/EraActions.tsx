"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EraActions({
  id,
  isCurrent,
  active,
}: {
  id: string;
  isCurrent: boolean;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setCurrent() {
    setPending(true);
    const res = await fetch(`/api/admin/eras/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isCurrent: true }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  async function archive() {
    if (!confirm("archive this era? directions inside stay but the era hides from fans."))
      return;
    setPending(true);
    const res = await fetch(`/api/admin/eras/${id}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {!isCurrent && active && (
        <button onClick={setCurrent} disabled={pending} className="btn btn-ghost">
          make current
        </button>
      )}
      {active && (
        <button onClick={archive} disabled={pending} className="btn btn-ghost">
          archive
        </button>
      )}
    </div>
  );
}
