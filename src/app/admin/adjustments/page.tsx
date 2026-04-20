import { prisma } from "@/lib/db";
import { AdjustForm } from "./AdjustForm";

export const dynamic = "force-dynamic";

export default async function AdminAdjustments() {
  const recent = await prisma.auditLog.findMany({
    where: { action: "points.manual_adjust" },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  // Fetch display info for the targets.
  const userIds = Array.from(
    new Set(recent.map((r) => r.targetId).filter((x): x is string => !!x))
  );
  const targets = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, email: true },
  });
  const tMap = new Map(targets.map((t) => [t.id, t]));

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 12 }}>point adjustments</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        manually credit or debit a fan&rsquo;s balance. every adjustment is logged with
        who did it, why, and the resulting transaction id. negative deltas can&rsquo;t
        overdraw. optionally push the fan a soft note.
      </p>
      <AdjustForm />

      <div style={{ marginTop: 40 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          recent adjustments
        </div>
        {recent.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            nothing yet.
          </p>
        )}
        {recent.map((r) => {
          const t = r.targetId ? tMap.get(r.targetId) : null;
          const payload = (r.payload as {
            delta?: number;
            reason?: string;
          } | null) ?? {};
          return (
            <div
              key={r.id}
              className="admin-surface"
              style={{
                padding: 12,
                marginBottom: 8,
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 20,
                  fontWeight: 500,
                  color: (payload.delta ?? 0) >= 0 ? "var(--success)" : "var(--danger)",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 88,
                  textAlign: "right",
                }}
              >
                {(payload.delta ?? 0) >= 0 ? "+" : ""}
                {payload.delta?.toLocaleString() ?? "0"}
              </span>
              <div>
                <div>
                  {t?.displayName?.toLowerCase() ?? t?.email ?? r.targetId?.slice(0, 8) ?? "?"}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                  {payload.reason ?? "(no reason)"}
                </div>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
