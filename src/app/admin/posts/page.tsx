import { prisma } from "@/lib/db";
import { PostForm } from "./PostForm";
import { PostActions } from "./PostActions";

export const dynamic = "force-dynamic";

export default async function AdminPosts() {
  const posts = await prisma.post.findMany({
    orderBy: [{ active: "desc" }, { pinned: "desc" }, { publishedAt: "desc" }],
    include: { _count: { select: { likes: true } } },
  });

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>moments</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        little posts fans see on home and /posts. keep them short and in voice. photos
        optional. link to a track or a store page if it fits.
      </p>
      <PostForm />
      <div style={{ marginTop: 24 }}>
        {posts.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no posts yet.</p>
        )}
        {posts.map((p) => (
          <div
            key={p.id}
            className="admin-surface"
            style={{
              padding: 16,
              marginBottom: 10,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "center",
              opacity: p.active ? 1 : 0.55,
            }}
          >
            <div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {p.publishedAt.toISOString().slice(0, 16).replace("T", " ")}
                {p.pinned ? " · pinned" : ""}
                {!p.active ? " · archived" : ""} · {p._count.likes} held
              </div>
              <div
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 15,
                  lineHeight: 1.5,
                  maxWidth: 560,
                }}
              >
                {p.body.length > 200 ? `${p.body.slice(0, 200)}…` : p.body}
              </div>
            </div>
            <PostActions id={p.id} pinned={p.pinned} active={p.active} />
          </div>
        ))}
      </div>
    </div>
  );
}
