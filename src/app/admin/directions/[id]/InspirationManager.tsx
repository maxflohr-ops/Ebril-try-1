"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Image {
  id: string;
  url: string;
  pinUrl: string | null;
  caption: string | null;
  attribution: string | null;
}

export function InspirationManager({
  briefId,
  initial,
}: {
  briefId: string;
  initial: Image[];
}) {
  const router = useRouter();
  const [batch, setBatch] = useState("");
  const [singleUrl, setSingleUrl] = useState("");
  const [pinUrl, setPinUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [attribution, setAttribution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!singleUrl) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(
      `/api/admin/directions/${briefId}/inspiration`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: singleUrl,
          pinUrl: pinUrl || null,
          caption: caption || null,
          attribution: attribution || null,
        }),
      }
    );
    setSubmitting(false);
    if (!res.ok) {
      setError("didn't add.");
      return;
    }
    setSingleUrl("");
    setPinUrl("");
    setCaption("");
    setAttribution("");
    router.refresh();
  }

  async function addBatch() {
    const lines = batch
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && /^https?:\/\//.test(l));
    if (lines.length === 0) {
      setError("paste one url per line.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(
      `/api/admin/directions/${briefId}/inspiration`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines.map((url, i) => ({ url, sortOrder: initial.length + i })),
        }),
      }
    );
    setSubmitting(false);
    if (!res.ok) {
      setError("didn't add — check the urls.");
      return;
    }
    setBatch("");
    router.refresh();
  }

  async function remove(imageId: string) {
    if (!confirm("remove this pin?")) return;
    const res = await fetch(
      `/api/admin/directions/${briefId}/inspiration/${imageId}`,
      { method: "DELETE" }
    );
    if (res.ok) router.refresh();
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
    <div>
      <div
        className="admin-surface"
        style={{
          padding: 16,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <form onSubmit={addSingle} style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            add one pin
          </div>
          <input
            required
            type="url"
            style={input}
            value={singleUrl}
            onChange={(e) => setSingleUrl(e.target.value)}
            placeholder="image url (direct .jpg/.png/.webp)"
          />
          <input
            style={input}
            value={pinUrl}
            onChange={(e) => setPinUrl(e.target.value)}
            placeholder="pinterest pin url (optional, for attribution)"
          />
          <input
            style={input}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="caption (optional, one line)"
          />
          <input
            style={input}
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            placeholder="credit (e.g. @pinner)"
          />
          <button type="submit" disabled={submitting} className="btn">
            {submitting ? "…" : "add pin"}
          </button>
        </form>
        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            or paste a batch
          </div>
          <textarea
            style={{ ...input, minHeight: 160, resize: "vertical", fontSize: 13 }}
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder={"one image or pin url per line\nblank lines are ignored"}
          />
          <button
            type="button"
            onClick={addBatch}
            disabled={submitting}
            className="btn btn-ghost"
          >
            add all
          </button>
        </div>
        {error && (
          <div style={{ gridColumn: "1 / -1", color: "var(--danger)", fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      {initial.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {initial.map((img) => (
            <figure
              key={img.id}
              className="admin-surface"
              style={{
                margin: 0,
                padding: 0,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                style={{
                  width: "100%",
                  aspectRatio: "4/5",
                  objectFit: "cover",
                  display: "block",
                  filter: "saturate(0.92)",
                }}
              />
              <figcaption
                style={{
                  padding: "8px 10px",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                  minHeight: 34,
                }}
              >
                {img.caption ?? img.attribution ?? ""}
              </figcaption>
              <button
                type="button"
                onClick={() => remove(img.id)}
                aria-label="remove"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: "rgba(21,16,14,0.85)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
