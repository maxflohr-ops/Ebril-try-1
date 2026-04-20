"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  /** API endpoint to hit. Omit leading origin — relative is fine. */
  endpoint: string;
  /** HTTP method — defaults to DELETE since that's the common case. */
  method?: "DELETE" | "POST" | "PATCH";
  /** JSON body to send (serialized automatically). */
  body?: unknown;
  /** confirm() text. Empty string disables the confirm prompt. */
  confirm: string;
  /** button label while idle. */
  label: string;
  /** optional busy label; defaults to "…". */
  busyLabel?: string;
  /** route.refresh() after a successful response; defaults to true. */
  refreshOnSuccess?: boolean;
  /** optional onDone callback after successful response, called before refresh. */
  onDone?: () => void;
  /** ghost variant (default) or solid. */
  variant?: "ghost" | "solid";
}

/**
 * Tiny reusable confirm-then-fetch button. Replaces the half-dozen near-
 * identical ArchiveButton / DeleteButton components scattered across the
 * admin surfaces.
 */
export function ConfirmActionButton({
  endpoint,
  method = "DELETE",
  body,
  confirm,
  label,
  busyLabel = "…",
  refreshOnSuccess = true,
  onDone,
  variant = "ghost",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    const res = await fetch(endpoint, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) return;
    onDone?.();
    if (refreshOnSuccess) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={variant === "solid" ? "btn" : "btn btn-ghost"}
    >
      {pending ? busyLabel : label}
    </button>
  );
}
