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
      style={{
        background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
        borderRadius: 16,
        padding: 20,
        color: "white",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>
        Current tier
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{tierName ?? "Unranked"}</div>
      {nextTierName && (
        <>
          <div
            style={{
              marginTop: 16,
              background: "rgba(255,255,255,0.25)",
              height: 8,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "white",
                transition: "width 400ms",
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
            ${(toNextCents / 100).toFixed(2)}/mo more to reach <b>{nextTierName}</b>
          </div>
        </>
      )}
      {!nextTierName && (
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>Top tier unlocked.</div>
      )}
    </div>
  );
}
