import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const actorIds = Array.from(new Set(logs.map((l) => l.actorId).filter((a) => a !== "system")));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, displayName: true, email: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Audit log</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
            <th style={{ padding: 8 }}>When</th>
            <th style={{ padding: 8 }}>Actor</th>
            <th style={{ padding: 8 }}>Action</th>
            <th style={{ padding: 8 }}>Target</th>
            <th style={{ padding: 8 }}>Payload</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => {
            const actor = actorMap.get(l.actorId);
            return (
              <tr key={l.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                  {l.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                </td>
                <td style={{ padding: 8 }}>
                  {l.actorId === "system" ? "system" : actor?.displayName ?? actor?.email ?? l.actorId.slice(0, 8)}
                </td>
                <td style={{ padding: 8, fontFamily: "monospace" }}>{l.action}</td>
                <td style={{ padding: 8, fontFamily: "monospace", fontSize: 11 }}>
                  {l.targetId ?? "—"}
                </td>
                <td
                  style={{
                    padding: 8,
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    maxWidth: 320,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.payload ? JSON.stringify(l.payload) : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {logs.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No log entries yet.</p>
      )}
    </div>
  );
}
