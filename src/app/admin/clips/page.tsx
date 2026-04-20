import Link from "next/link";
import { prisma } from "@/lib/db";
import { ModerationRow } from "./ModerationRow";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "pending", label: "with me" },
  { value: "approved", label: "kept" },
  { value: "featured", label: "held" },
  { value: "viral", label: "carried" },
  { value: "rejected", label: "returned" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default async function AdminClips({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = (TABS.find((t) => t.value === searchParams.status)?.value ?? "pending") as Tab;
  const clips = await prisma.clip.findMany({
    where: { status: status as never },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      brief: {
        select: {
          id: true,
          title: true,
          pointsApproved: true,
          pointsFeatured: true,
          pointsViral: true,
          era: { select: { name: true, accentColor: true } },
        },
      },
      // user lookup via a second query for efficiency
    },
  });
  const userIds = Array.from(new Set(clips.map((c) => c.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, email: true, avatarUrl: true },
  });
  const uMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 16 }}>clips</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/clips?status=${t.value}`}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              background: status === t.value ? "var(--accent)" : "#1A1613",
              color: status === t.value ? "white" : "var(--text-muted)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {clips.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>nothing in this bucket.</p>
      )}

      {clips.map((c) => (
        <ModerationRow
          key={c.id}
          id={c.id}
          url={c.url}
          platform={c.platform}
          caption={c.caption}
          status={c.status}
          viewCount={c.viewCount}
          pointsAwarded={c.pointsAwarded}
          adminNotes={c.adminNotes}
          rejectedReason={c.rejectedReason}
          createdAt={c.createdAt.toISOString()}
          brief={{
            title: c.brief.title,
            era: c.brief.era.name,
            accent: c.brief.era.accentColor,
            pointsApproved: c.brief.pointsApproved,
            pointsFeatured: c.brief.pointsFeatured,
            pointsViral: c.brief.pointsViral,
          }}
          fan={uMap.get(c.userId) ?? null}
        />
      ))}
    </div>
  );
}
