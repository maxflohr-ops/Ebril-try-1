"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeedConnector({
  briefId,
  initialFeedUrl,
  lastSyncedAt,
}: {
  briefId: string;
  initialFeedUrl: string | null;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/directions/${briefId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inspirationFeedUrl: feedUrl || null }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("didn't save.");
      return;
    }
    setMessage(feedUrl ? "saved." : "feed removed.");
    router.refresh();
  }

  async function sync() {
    setSyncing(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/directions/${briefId}/sync-feed`, {
      method: "POST",
    });
    setSyncing(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        body.error === "no_feed_configured"
          ? "add a feed url first."
          : "sync failed."
      );
      return;
    }
    setMessage(
      `added ${body.added} new · skipped ${body.skipped} already-seen.`
    );
    router.refresh();
  }

  return (
    <div
      className="admin-surface"
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
        alignItems: "end",
      }}
    >
      <label style={{ display: "block" }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          feed url
        </div>
        <input
          type="url"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          placeholder="https://www.pinterest.com/ebril/dusk-window.rss"
          style={{
            background: "#110D0B",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 10px",
            width: "100%",
            fontFamily: "inherit",
          }}
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn btn-ghost"
      >
        {saving ? "…" : "save"}
      </button>
      <button
        type="button"
        onClick={sync}
        disabled={syncing || !feedUrl}
        className="btn"
      >
        {syncing ? "syncing…" : "sync now"}
      </button>
      <div
        style={{
          gridColumn: "1 / -1",
          color: "var(--text-muted)",
          fontSize: 12,
          letterSpacing: "0.04em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          {lastSyncedAt
            ? `last synced ${new Date(lastSyncedAt).toISOString().slice(0, 16).replace("T", " ")}`
            : "never synced"}
        </span>
        {message && <span style={{ color: "var(--success)" }}>{message}</span>}
        {error && <span style={{ color: "var(--danger)" }}>{error}</span>}
      </div>
    </div>
  );
}
