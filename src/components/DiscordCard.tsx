"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialAccount: {
    username: string;
    globalName: string | null;
    avatarUrl: string | null;
    linkedAt: string;
  } | null;
  available: boolean;
  flashStatus: string | null;
}

const FLASH_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "discord linked." },
  denied: { ok: false, text: "discord sign-in cancelled." },
  invalid_state: { ok: false, text: "session expired — try again." },
  id_taken: { ok: false, text: "that discord account is already linked to a different copula user." },
  error: { ok: false, text: "couldn't finish linking. try again." },
};

export function DiscordCard({ initialAccount, available, flashStatus }: Props) {
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const [busy, setBusy] = useState(false);

  const flash = flashStatus ? FLASH_MESSAGES[flashStatus] : null;

  async function unlink() {
    if (!confirm("unlink your discord account?")) return;
    setBusy(true);
    const res = await fetch("/api/auth/discord/unlink", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setAccount(null);
      router.refresh();
    }
  }

  if (!available && !account) return null;

  if (account) {
    return (
      <div
        className="surface"
        style={{
          padding: 20,
          marginBottom: 16,
          background:
            "linear-gradient(160deg, rgba(88,101,242,0.14) 0%, rgba(30,24,21,0.95) 70%)",
          borderColor: "rgba(88,101,242,0.32)",
        }}
      >
        <div className="eyebrow" style={{ color: "#9aa8ff" }}>
          discord linked
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.avatarUrl}
                alt=""
                width={36}
                height={36}
                style={{ borderRadius: 999 }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#5865F2",
                }}
              />
            )}
            <div>
              <div className="serif" style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.2 }}>
                {(account.globalName ?? account.username).toLowerCase()}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                @{account.username}
              </div>
            </div>
          </div>
          <button onClick={unlink} disabled={busy} className="btn btn-ghost">
            unlink
          </button>
        </div>
        {flash && (
          <div
            style={{
              color: flash.ok ? "var(--success)" : "var(--danger)",
              fontSize: 13,
              marginTop: 10,
            }}
          >
            {flash.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="surface" style={{ padding: 20, marginBottom: 16 }}>
      <div className="eyebrow">discord</div>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
        link your discord so ebril&rsquo;s server can find you. tier roles + show
        announcements will sync through your discord identity when the
        bot lands.
      </p>
      <div style={{ marginTop: 14 }}>
        <a href="/api/auth/discord" className="btn" style={{ background: "#5865F2" }}>
          sign in with discord
        </a>
      </div>
      {flash && (
        <div
          style={{
            color: flash.ok ? "var(--success)" : "var(--danger)",
            fontSize: 13,
            marginTop: 10,
          }}
        >
          {flash.text}
        </div>
      )}
    </div>
  );
}
