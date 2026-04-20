interface Props {
  tierName: string | null;
  nextTierName: string | null;
  progressPct: number;
  monthlyCents: number;
  nextThresholdCents: number | null;
}

export function TierCard({
  tierName,
  nextTierName,
  progressPct,
  monthlyCents,
  nextThresholdCents,
}: Props) {
  const toNextCents = nextThresholdCents ? Math.max(0, nextThresholdCents - monthlyCents) : 0;
  return (
    <div
      className="surface"
      style={{
        padding: 24,
        background: "linear-gradient(160deg, rgba(107,74,94,0.55) 0%, rgba(30,24,21,0.95) 100%)",
      }}
    >
      <div className="eyebrow">your tier</div>
      <div
        className="serif"
        style={{
          fontSize: 34,
          fontWeight: 500,
          marginTop: 8,
          lineHeight: 1.1,
        }}
      >
        {tierName ? tierName.toLowerCase() : "unranked"}
      </div>
      {nextTierName ? (
        <div style={{ marginTop: 20 }}>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
            ${(toNextCents / 100).toFixed(2)} a month from{" "}
            <span style={{ color: "var(--text)" }}>{nextTierName.toLowerCase()}</span>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
          you&rsquo;re as close as it gets. thank you, truly.
        </div>
      )}
    </div>
  );
}
