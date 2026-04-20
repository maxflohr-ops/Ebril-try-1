"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error("not set up on our side yet.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("okay, maybe later.");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("couldn't finish that. try again in a bit.");
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something didn't land.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something didn't land.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="surface" style={{ padding: 20, marginBottom: 16 }}>
      <div className="eyebrow">soft notifications</div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          {subscribed
            ? "on. i'll whisper when something lands."
            : "off. i'll stay quiet."}
        </div>
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={busy}
          className={subscribed ? "btn btn-ghost" : "btn"}
        >
          {busy ? "…" : subscribed ? "turn off" : "turn on"}
        </button>
      </div>
      {error && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
