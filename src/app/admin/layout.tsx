import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  return (
    <div
      className="admin"
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        minHeight: "100vh",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid var(--border)",
          padding: 20,
          background: "#191513",
        }}
      >
        <div
          className="serif"
          style={{
            fontSize: 22,
            fontWeight: 500,
            marginBottom: 28,
            letterSpacing: "-0.015em",
          }}
        >
          ebril / admin
        </div>
        <nav className="admin-nav" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Link href="/admin">dashboard</Link>
          <Link href="/admin/rituals">rituals</Link>
          <Link href="/admin/campaigns">campaigns</Link>
          <Link href="/admin/rewards">rewards</Link>
          <Link href="/admin/point-packs">point packs</Link>
          <Link href="/admin/redemptions">redemptions</Link>
          <Link href="/admin/links">find me</Link>
          <Link href="/admin/diary">shared diary</Link>
          <Link href="/admin/audit">audit</Link>
        </nav>
        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          backstage
        </div>
      </aside>
      <main style={{ padding: 28 }}>{children}</main>
    </div>
  );
}
