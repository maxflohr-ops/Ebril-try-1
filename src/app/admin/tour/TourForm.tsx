"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TourForm() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [country, setCountry] = useState("CA");
  const [startsAt, setStartsAt] = useState("");
  const [doorsAt, setDoorsAt] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [pointsReward, setPointsReward] = useState("100");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/tour", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        city,
        venue,
        country,
        startsAt: new Date(startsAt).toISOString(),
        doorsAt: doorsAt ? new Date(doorsAt).toISOString() : null,
        ticketUrl: ticketUrl || null,
        noteFromEbril: note || null,
        pointsReward: Number(pointsReward),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("didn't save — check the fields.");
      return;
    }
    setCity("");
    setVenue("");
    setStartsAt("");
    setDoorsAt("");
    setTicketUrl("");
    setPointsReward("100");
    setNote("");
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
      style={{
        padding: 18,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
      }}
    >
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>city</div>
        <input required style={input} value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>venue</div>
        <input
          required
          style={input}
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>country (2-letter)</div>
        <input
          required
          maxLength={2}
          style={input}
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>show starts</div>
        <input
          required
          type="datetime-local"
          style={input}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>doors (optional)</div>
        <input
          type="datetime-local"
          style={input}
          value={doorsAt}
          onChange={(e) => setDoorsAt(e.target.value)}
        />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tickets url</div>
        <input
          style={input}
          value={ticketUrl}
          onChange={(e) => setTicketUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <label style={{ gridColumn: "span 3" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>note from ebril (optional)</div>
        <textarea
          style={{ ...input, minHeight: 44, resize: "vertical" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="quiet aside for the people who come"
        />
      </label>
      <label>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>points on check-in</div>
        <input
          type="number"
          min="0"
          style={input}
          value={pointsReward}
          onChange={(e) => setPointsReward(e.target.value)}
        />
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "…" : "add show"}
        </button>
        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    </form>
  );
}
