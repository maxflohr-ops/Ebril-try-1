"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RotateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("rotate this show's qr code? old posters stop working.")) return;
    setPending(true);
    const res = await fetch(`/api/admin/tour/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rotateQr: true }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <button onClick={onClick} disabled={pending} className="btn btn-ghost">
      {pending ? "…" : "rotate qr"}
    </button>
  );
}
