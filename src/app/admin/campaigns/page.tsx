import { prisma } from "@/lib/db";
import { CampaignForm } from "./CampaignForm";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function CampaignsAdmin() {
  const campaigns = await prisma.campaign.findMany({ orderBy: { startsAt: "desc" } });
  const now = new Date();

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Campaigns</h2>
      <CampaignForm />
      <div style={{ marginTop: 24 }}>
        {campaigns.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No campaigns yet.</p>
        )}
        {campaigns.map((c) => {
          const live = c.startsAt <= now && c.endsAt >= now;
          return (
            <div
              key={c.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong>{c.name}</strong>
                  {live && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--accent)",
                        color: "white",
                      }}
                    >
                      LIVE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  ×{c.multiplier.toFixed(2)}
                  {c.flatBonus ? ` + ${c.flatBonus} pts` : ""} · {c.startsAt.toISOString().slice(0, 10)} →{" "}
                  {c.endsAt.toISOString().slice(0, 10)}
                </div>
              </div>
              <DeleteButton id={c.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
