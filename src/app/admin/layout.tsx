import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          borderRight: "1px solid var(--border)",
          padding: 20,
          background: "var(--bg-card)",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 24 }}>Ebril Admin</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/campaigns">Campaigns</Link>
          <Link href="/admin/rewards">Rewards</Link>
          <Link href="/admin/redemptions">Redemptions</Link>
        </nav>
      </aside>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
