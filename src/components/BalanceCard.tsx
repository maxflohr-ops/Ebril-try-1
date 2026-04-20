import { BalanceCounter } from "./BalanceCounter";

export function BalanceCard({ balance, userKey }: { balance: number; userKey?: string }) {
  return (
    <div
      style={{
        position: "relative",
        padding: "36px 28px 28px",
        textAlign: "center",
      }}
    >
      <div className="eyebrow">balance</div>
      <div
        className="serif"
        style={{
          fontSize: 72,
          fontWeight: 500,
          color: "var(--accent)",
          lineHeight: 1,
          marginTop: 12,
          letterSpacing: "-0.03em",
        }}
      >
        <BalanceCounter value={balance} userKey={userKey} />
      </div>
      <div
        style={{
          marginTop: 10,
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        points
      </div>
    </div>
  );
}
