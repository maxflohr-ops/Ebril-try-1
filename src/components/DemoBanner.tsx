import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isDemoMode } from "@/lib/demo";

// Only rendered when DEMO_MODE=1. Makes the fact that the app is running in
// demo mode painfully visible — no chance of shipping a build with the demo
// auth bypass quiet in the background.
export async function DemoBanner() {
  if (!isDemoMode()) return null;

  const session = await getSession();
  const fan = session.userId
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { displayName: true, patreonUserId: true },
      })
    : null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 80,
        padding: "8px 14px",
        background:
          "repeating-linear-gradient(45deg, #ffd06a22 0 10px, transparent 10px 20px), #2A1A1F",
        borderBottom: "1px solid rgba(216,155,122,0.35)",
        color: "var(--text)",
        fontSize: 12,
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span style={{ color: "var(--accent)", fontWeight: 600, textTransform: "uppercase" }}>
        demo mode
      </span>
      <span style={{ color: "var(--text-muted)", flex: 1, minWidth: 0 }}>
        {fan
          ? `signed in as ${fan.displayName?.toLowerCase() ?? fan.patreonUserId}`
          : "no fan chosen"}
        {" · "}
        auth bypass is live; never enable in production.
      </span>
      <span style={{ display: "flex", gap: 10 }}>
        <Link
          href="/demo"
          style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 2 }}
        >
          switch
        </Link>
        {fan && (
          <Link
            href="/api/demo/sign-out"
            style={{
              color: "var(--text-muted)",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            sign out
          </Link>
        )}
      </span>
    </div>
  );
}
