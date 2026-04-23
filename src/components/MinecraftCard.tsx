"use client";

import { useState } from "react";

interface Props {
  initialAccount: {
    mcUsername: string;
    linkedAt: string;
    lastSeenAt: string | null;
  } | null;
  initialCode: {
    code: string;
    expiresAt: string;
  } | null;
}

export function MinecraftCard({ initialAccount, initialCode }: Props) {
  const [account, setAccount] = useState(initialAccount);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startLink() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/minecraft/link", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError("couldn't generate a code — try again in a minute.");
      return;
    }
    const body = await res.json();
    if (body.alreadyLinked) {
      setAccount({
        mcUsername: body.mcUsername,
        linkedAt: new Date().toISOString(),
        lastSeenAt: null,
      });
      return;
    }
    setCode({ code: body.code, expiresAt: body.expiresAt });
  }

  async function unlink() {
    if (!confirm("unlink your minecraft account? in-game rewards will stop.")) return;
    setBusy(true);
    const res = await fetch("/api/minecraft/unlink", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setAccount(null);
      setCode(null);
    }
  }

  async function copyCode(v: string) {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // long-press still works as a fallback
    }
  }

  if (account) {
    const lastSeen = account.lastSeenAt
      ? new Date(account.lastSeenAt).toISOString().slice(0, 10)
      : null;
    return (
      <div
        className="surface"
        style={{
          padding: 20,
          marginBottom: 16,
          background:
            "linear-gradient(160deg, rgba(139,168,136,0.14) 0%, rgba(30,24,21,0.95) 70%)",
          borderColor: "rgba(139,168,136,0.3)",
        }}
      >
        <div className="eyebrow" style={{ color: "var(--success)" }}>
          minecraft linked
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            className="serif"
            style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2 }}
          >
            {account.mcUsername}
          </div>
          <button onClick={unlink} disabled={busy} className="btn btn-ghost">
            unlink
          </button>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
          tier + cassettes sync in-game on login. points land here from
          anything the server grants you.
          {lastSeen && ` last seen ${lastSeen}.`}
        </div>
      </div>
    );
  }

  return (
    <div className="surface" style={{ padding: 20, marginBottom: 16 }}>
      <div className="eyebrow">minecraft</div>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 14,
          marginTop: 10,
          lineHeight: 1.6,
        }}
      >
        link your minecraft account to see your tier in-game, unlock rewards,
        and earn points for playing on ebril&rsquo;s server.
      </p>

      {code ? (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => copyCode(code.code)}
            style={{
              width: "100%",
              padding: "18px 20px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(216,155,122,0.4)",
              borderRadius: 14,
              color: "var(--accent)",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            {code.code}
          </button>
          <div
            style={{
              marginTop: 10,
              color: "var(--text-muted)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            in-game, type{" "}
            <code
              style={{
                background: "rgba(216,155,122,0.15)",
                padding: "1px 6px",
                borderRadius: 4,
                color: "var(--accent)",
              }}
            >
              /copula link {code.code}
            </code>
            {" "}
            to connect. {copied ? "copied." : "tap the code to copy."} expires{" "}
            {new Date(code.expiresAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={startLink} disabled={busy}>
            {busy ? "…" : "link my minecraft account"}
          </button>
        </div>
      )}
      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>{error}</div>}
    </div>
  );
}
