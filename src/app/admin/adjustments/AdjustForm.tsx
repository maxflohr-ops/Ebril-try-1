"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Fan {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  patreonUserId: string;
  balance: number;
  currentTier: { name: string } | null;
}

export function AdjustForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Fan[]>([]);
  const [picked, setPicked] = useState<Fan | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [expires, setExpires] = useState(false);
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (picked) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) return;
      const body = await res.json();
      setResults(body.users);
    }, 200);
  }, [query, picked]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError("pick a fan first.");
      return;
    }
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      setError("delta must be non-zero.");
      return;
    }
    if (!reason.trim()) {
      setError("write a reason — it lives in the audit log forever.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/adjustments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: picked.id,
        delta: d,
        reason: reason.trim(),
        expires,
        notify,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        body.error === "would_overdraw"
          ? `that would overdraw — current balance is ${body.balance.toLocaleString()}.`
          : body.error === "user_not_found"
            ? "that fan no longer exists."
            : "didn't save."
      );
      return;
    }
    const body = await res.json();
    setMessage(
      `${d >= 0 ? "+" : ""}${d.toLocaleString()} applied. new balance ${body.newBalance.toLocaleString()}.`
    );
    setDelta("");
    setReason("");
    setExpires(false);
    setNotify(false);
    setPicked({ ...picked, balance: body.newBalance });
    router.refresh();
  }

  const input: React.CSSProperties = {
    background: "#110D0B",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <form
      onSubmit={submit}
      className="admin-surface"
      style={{ padding: 18, display: "grid", gap: 14 }}
    >
      <label>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          fan (search by name, email, or patreon id)
        </div>
        {picked ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#110D0B",
              border: "1px solid rgba(216,155,122,0.35)",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            {picked.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={picked.avatarUrl}
                alt=""
                width={28}
                height={28}
                style={{ borderRadius: 999 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {picked.displayName ?? picked.email ?? picked.id.slice(0, 8)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {picked.email ?? "—"} · {picked.currentTier?.name.toLowerCase() ?? "unranked"}{" "}
                · balance {picked.balance.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setQuery("");
                setResults([]);
              }}
              className="btn btn-ghost"
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              change
            </button>
          </div>
        ) : (
          <>
            <input
              style={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. ehug, hannah@…, or a patreon id"
            />
            {results.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  background: "#110D0B",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {results.map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setPicked(u)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: "transparent",
                      border: "none",
                      borderTop: "1px solid rgba(255,255,255,0.03)",
                      color: "var(--text)",
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    {u.avatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatarUrl}
                        alt=""
                        width={24}
                        height={24}
                        style={{ borderRadius: 999 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {u.displayName ?? u.email ?? u.id.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {u.email ?? "—"} · balance {u.balance.toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <label>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>delta (can be negative)</div>
          <input
            style={input}
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="e.g. 250 or -100"
          />
        </label>
        <label>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>reason (in the audit log)</div>
          <input
            style={input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="lost points on the show ticket refund"
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={expires}
            onChange={(e) => setExpires(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          credits expire in 18 months (like pledge points)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          push the fan a note
        </label>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <button type="submit" disabled={busy} className="btn">
          {busy ? "…" : "apply adjustment"}
        </button>
        {message && <span style={{ color: "var(--success)", fontSize: 13 }}>{message}</span>}
        {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
      </div>
    </form>
  );
}
