import { prisma } from "@/lib/db";
import { LinkForm } from "./LinkForm";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminLinks() {
  const links = await prisma.externalLink.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>find me</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        links that render on fan home and across the app. spotify, youtube, merch, socials.
        on mobile, these open the native apps.
      </p>
      <LinkForm />
      <div style={{ marginTop: 24 }}>
        {links.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no links yet.</p>
        )}
        {links.map((l) => (
          <div
            key={l.id}
            className="admin-surface"
            style={{
              padding: 14,
              marginBottom: 8,
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              alignItems: "center",
              opacity: l.active ? 1 : 0.55,
            }}
          >
            <span className="chip" style={{ minWidth: 120, textAlign: "center" }}>
              {l.kind.replace(/_/g, " ")}
            </span>
            <div>
              <div style={{ fontWeight: 600 }}>{l.label}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                  wordBreak: "break-all",
                }}
              >
                {l.url}
              </div>
            </div>
            <DeleteButton id={l.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
