export function BalanceCard({ balance }: { balance: number }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Points balance
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, marginTop: 6 }}>
        {balance.toLocaleString()}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
        Earn 10 pts per $1 pledged on Patreon.
      </div>
    </div>
  );
}
