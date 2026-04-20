import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { activeRitualForUser } from "@/lib/rituals";
import { WelcomeFlow } from "./WelcomeFlow";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      displayName: true,
      onboardedAt: true,
    },
  });
  if (!user) redirect("/");
  // Already onboarded — don't keep offering the first-login flow.
  if (user.onboardedAt) redirect("/");

  const [ritual, currentDirection, latestNote] = await Promise.all([
    activeRitualForUser(user.id),
    prisma.clippingBrief.findFirst({
      where: { active: true, era: { active: true, isCurrent: true } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { era: { select: { name: true, accentColor: true } } },
    }),
    prisma.voiceNote.findFirst({
      where: { active: true, tierRequiredId: null },
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true, caption: true, durationSec: true },
    }),
  ]);

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "40px 20px 96px",
        position: "relative",
      }}
    >
      <div className="hero-wash" style={{ height: 520 }} />
      <WelcomeFlow
        displayName={user.displayName?.toLowerCase() ?? null}
        ritual={
          ritual
            ? {
                id: ritual.id,
                title: ritual.title,
                body: ritual.body.split("\n")[0] ?? ritual.body,
                pointsReward: ritual.pointsReward,
                claimed: ritual.claimed,
              }
            : null
        }
        direction={
          currentDirection
            ? {
                id: currentDirection.id,
                title: currentDirection.title,
                eraName: currentDirection.era.name,
                accent: currentDirection.era.accentColor,
                pointsViral: currentDirection.pointsViral,
              }
            : null
        }
        voiceNote={
          latestNote
            ? {
                id: latestNote.id,
                title: latestNote.title,
                caption: latestNote.caption,
              }
            : null
        }
      />
    </main>
  );
}
