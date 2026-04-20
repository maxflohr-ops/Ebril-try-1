import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PostCard } from "@/components/PostCard";
import { ComeInsideRail } from "@/components/ComeInsideRail";

export const dynamic = "force-dynamic";

export default async function PostsFeed() {
  const session = await getSession();
  const signedIn = !!session.userId;

  const [posts, liked] = await Promise.all([
    prisma.post.findMany({
      where: { active: true },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 60,
      include: { _count: { select: { likes: true } } },
    }),
    signedIn
      ? prisma.postLike.findMany({
          where: { userId: session.userId! },
          select: { postId: true },
        })
      : Promise.resolve([] as { postId: string }[]),
  ]);
  const likedSet = new Set(liked.map((l) => l.postId));

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 96px" }}>
      <div className="eyebrow">from ebril</div>
      <h2 style={{ marginTop: 6 }}>moments, as they come.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 15,
          marginTop: 10,
          maxWidth: 460,
        }}
      >
        small things i wanted to tell you. photos from the day, a line i&rsquo;m writing, a
        song i can&rsquo;t stop. hold the ones that land.
      </p>

      <div style={{ marginTop: 28 }}>
        {posts.length === 0 ? (
          <div
            className="surface"
            style={{ padding: 32, textAlign: "center" }}
          >
            <div
              className="serif"
              style={{ fontSize: 20, fontWeight: 500 }}
            >
              nothing yet.
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                marginTop: 8,
              }}
            >
              i&rsquo;ll leave something soon.
            </p>
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              id={p.id}
              body={p.body}
              imageUrl={p.imageUrl}
              audioUrl={p.audioUrl}
              linkUrl={p.linkUrl}
              linkLabel={p.linkLabel}
              moodTag={p.moodTag}
              publishedAt={p.publishedAt.toISOString()}
              pinned={p.pinned}
              likeCount={p._count.likes}
              liked={likedSet.has(p.id)}
              signedIn={signedIn}
            />
          ))
        )}
      </div>

      {!signedIn && (
        <ComeInsideRail line="hold the moments that land, write your own diary pages, earn points for the clips you make — all free once you're in." />
      )}
    </main>
  );
}
