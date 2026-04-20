"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [100, 250, 500, 1000];

export function GiftForm({
  myReferralCode,
  balance,
}: {
  myReferralCode: string;
  balance: number;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cap = Math.floor(balance * 0.5);
  const isSelf =
    code.trim().length > 0 && code.trim() === myReferralCode;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (isSelf) {
      setError("you can't send this one to yourself.");
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 100) {
      setError("minimum gift is 100 points.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/gift", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        toReferralCode: code.trim(),
        amount: Math.floor(n),
        note: note.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(friendlyError(body));
      return;
    }
    setMessage("kept and delivered. thank you for that.");
    setCode("");
    setAmount("100");
    setNote("");
    router.refresh();
  }

  const input: React.CSSProperties = {
    background: "transparent",
    color: "var(--text)",
    border: "none",
    borderBottom: "1px solid var(--border)",
    padding: "10px 0",
    fontFamily: "inherit",
    fontSize: 15,
    width: "100%",
  };

  return (
    <form className="surface" style={{ padding: 20 }} onSubmit={submit}>
      <label style={{ display: "block", marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          send to (their referral code)
        </div>
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="paste the code they shared"
          style={input}
        />
        {isSelf && (
          <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>
            that&rsquo;s your own code.
          </div>
        )}
      </label>

      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          how much
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {PRESETS.map((p) => {
            const selected = amount === String(p);
            const disabled = p > balance;
            return (
              <button
                type="button"
                key={p}
                onClick={() => setAmount(String(p))}
                disabled={disabled}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: selected
                    ? "rgba(216,155,122,0.2)"
                    : "transparent",
                  border: `1px solid ${selected ? "rgba(216,155,122,0.5)" : "var(--border)"}`,
                  color: selected ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
        <input
          type="number"
          min="100"
          max={Math.min(10_000, Math.max(100, cap))}
          step="10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={input}
        />
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
          you can gift up to {Math.max(100, cap).toLocaleString()} right now.
        </div>
      </div>

      <label style={{ display: "block", marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          a note (optional, 300 chars)
        </div>
        <textarea
          rows={2}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="why you sent it — a sentence is enough."
          style={{
            ...input,
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 17,
            lineHeight: 1.5,
            resize: "vertical",
          }}
        />
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "…" : "send it"}
        </button>
        {message && (
          <span style={{ color: "var(--success)", fontSize: 13 }}>{message}</span>
        )}
        {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
      </div>
    </form>
  );
}

function friendlyError(body: { error?: string; balance?: number; cap?: number }): string {
  switch (body.error) {
    case "rate_limited":
      return "three gifts a day is the limit — save one for tomorrow.";
    case "recipient_not_found":
      return "that code doesn't match anyone here.";
    case "self_gift":
      return "you can't send it to yourself.";
    case "insufficient_balance":
      return `you only have ${body.balance?.toLocaleString() ?? 0} points right now.`;
    case "gift_cap_exceeded":
      return `a single gift can't be more than half your balance — cap is ${body.cap?.toLocaleString() ?? 0}.`;
    case "invalid":
      return "check the amount and the code.";
    default:
      return "something didn't land. try again in a minute.";
  }
}
