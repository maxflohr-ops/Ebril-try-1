import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SeasonEditor } from "./SeasonEditor";
import { RewardManager } from "./RewardManager";

export const dynamic = "force-dynamic";

export default async function AdminSeasonPassDetail({
  params,
}: {
  params: { id: string };
}) {
  const season = await prisma.seasonPass.findUnique({
    where: { id: params.id },
    include: {
      rewards: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          _count: {
            select: {
              submissions: true,
              grants: true,
            },
          },
        },
      },
    },
  });
  if (!season) notFound();

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Link href="/admin/season-pass" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          ← all seasons
        </Link>
      </div>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>
        {season.name}
      </h1>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 22 }}>
        /season-pass · {season.startsAt.toISOString().slice(0, 10)} → {season.endsAt.toISOString().slice(0, 10)}
        {season.active ? " · live" : " · draft / archived"}
      </div>

      <SeasonEditor
        id={season.id}
        initial={{
          name: season.name,
          tagline: season.tagline ?? "",
          startsAt: season.startsAt.toISOString().slice(0, 16),
          endsAt: season.endsAt.toISOString().slice(0, 16),
          active: season.active,
        }}
      />

      <h2 style={{ fontSize: 14, marginTop: 28, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        rewards in this season
      </h2>

      <RewardManager
        seasonId={season.id}
        initial={season.rewards.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          kind: r.kind,
          imageUrl: r.imageUrl ?? "",
          sortOrder: r.sortOrder,
          minTierSortOrder: r.minTierSortOrder,
          submissionCount: r._count.submissions,
          grantCount: r._count.grants,
        }))}
      />
    </div>
  );
}
