"use client";

import { useState } from "react";

export function CopyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // iOS can reject clipboard writes outside a direct gesture; we are inside one, so this
      // should land, but if it doesn't the field is still selectable so fans can long-press.
    }
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          style={{
            background: copied ? "rgba(139,168,136,0.18)" : "transparent",
            color: copied ? "var(--success)" : "var(--accent)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            fontSize: 12,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <div
        style={{
          fontFamily: multiline
            ? "var(--font-fraunces), Georgia, serif"
            : "ui-monospace, SFMono-Regular, monospace",
          fontSize: multiline ? 15 : 13,
          lineHeight: 1.55,
          color: "var(--text)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
