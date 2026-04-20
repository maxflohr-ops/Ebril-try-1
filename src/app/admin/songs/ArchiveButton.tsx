"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("archive this song? its lyric page stops being visible.")) return;
    setPending(true);
    const res = await fetch(`/api/admin/songs/${id}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <button onClick={onClick} disabled={pending} className="btn btn-ghost">
      {pending ? "…" : "archive"}
    </button>
  );
}
