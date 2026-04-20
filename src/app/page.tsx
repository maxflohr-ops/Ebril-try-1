import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/points";
import { getTierProgress } from "@/lib/tiers";
import { BalanceCard } from "@/components/BalanceCard";
import { TierCard } from "@/components/TierCard";
import { RitualCard } from "@/components/RitualCard";
import { FindMeCard } from "@/components/FindMeCard";
import { DirectionHero } from "@/components/DirectionHero";
import { PostCard } from "@/components/PostCard";
import { activeRitualForUser } from "@/lib/rituals";
import { getSocialLinks, getShopifyStore } from "@/lib/externalLinks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session.userId) {
    // Show a landing page but fetch a preview post so anonymous visitors
    // see a living moment above the sign-in CTA.
    const previewPost = await prisma.post.findFirst({
      where: { active: true },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      include: { _count: { select: { likes: true } } },
    });
    return <Landing previewPost={previewPost} />;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return <Landing previewPost={null} />;

  const [
    balance,
    progress,
    ritual,
    socialLinks,
    shopifyStore,
    featuredDirection,
    latestPost,
  ] = await Promise.all([
    getBalance(user.id),
    getTierProgress(user.id),
    activeRitualForUser(user.id),
    getSocialLinks(),
    getShopifyStore(),
    prisma.clippingBrief.findFirst({
      where: { active: true, era: { active: true, isCurrent: true } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        era: { select: { name: true, slug: true, accentColor: true, secondaryColor: true } },
        song: { select: { title: true } },
        _count: {
          select: { clips: { where: { status: { in: ["featured", "viral"] } } } },
        },
      },
    }),
    prisma.post.findFirst({
      where: { active: true },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      include: { _count: { select: { likes: true } } },
    }),
  ]);

  const likedLatestPost = latestPost
    ? !!(await prisma.postLike.findUnique({
        where: { userId_postId: { userId: user.id, postId: latestPost.id } },
      }))
    : false;

  return (
    <main
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "32px 20px 64px",
        position: "relative",
      }}
    >
      <div className="hero-wash" />
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 36,
        }}
      >
        {user.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={44}
            height={44}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(216,155,122,0.35)",
            }}
          />
        )}
        <div>
          <div className="eyebrow">welcome back</div>
          <div
            className="serif"
            style={{ fontSize: 24, fontWeight: 500, marginTop: 2 }}
          >
            {user.displayName?.toLowerCase() ?? "you"}
          </div>
        </div>
      </header>

      {latestPost && (
        <div style={{ marginBottom: 22 }}>
          <PostCard
            id={latestPost.id}
            body={latestPost.body}
            imageUrl={latestPost.imageUrl}
            audioUrl={latestPost.audioUrl}
            linkUrl={latestPost.linkUrl}
            linkLabel={latestPost.linkLabel}
            moodTag={latestPost.moodTag}
            publishedAt={latestPost.publishedAt.toISOString()}
            pinned={latestPost.pinned}
            likeCount={latestPost._count.likes}
            liked={likedLatestPost}
          />
          <div style={{ textAlign: "right", marginTop: -6 }}>
            <Link
              href="/posts"
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                letterSpacing: "0.04em",
              }}
            >
              all moments →
            </Link>
          </div>
        </div>
      )}

      <BalanceCard balance={balance} userKey={user.id} />

      <div style={{ marginTop: 20 }}>
        <TierCard
          tierName={progress.current?.name ?? null}
          nextTierName={progress.next?.name ?? null}
          progressPct={progress.progressPct}
          monthlyCents={progress.qualifyingCentsPerMonth}
          nextThresholdCents={progress.next?.thresholdCentsPerMonth ?? null}
          userKey={user.id}
        />
      </div>

      {featuredDirection && (
        <div style={{ marginTop: 20 }}>
          <DirectionHero
            briefId={featuredDirection.id}
            eraName={featuredDirection.era.name}
            eraSlug={featuredDirection.era.slug}
            accentColor={featuredDirection.era.accentColor}
            secondaryColor={featuredDirection.era.secondaryColor}
            title={featuredDirection.title}
            direction={featuredDirection.direction}
            coverUrl={featuredDirection.coverUrl}
            songTitle={featuredDirection.song?.title ?? null}
            pointsViral={featuredDirection.pointsViral}
            hashtagHint={featuredDirection.hashtagHint}
            platformHint={featuredDirection.platformHint}
            hasSound={!!featuredDirection.tiktokSoundUrl}
            liveClipCount={featuredDirection._count.clips}
          />
        </div>
      )}

      {ritual && (
        <div style={{ marginTop: 20 }}>
          <RitualCard
            ritual={{
              id: ritual.id,
              title: ritual.title,
              body: ritual.body,
              trackTitle: ritual.trackTitle,
              trackUrl: ritual.trackUrl,
              artworkUrl: ritual.artworkUrl,
              endsAt: ritual.endsAt.toISOString(),
              pointsReward: ritual.pointsReward,
              claimed: ritual.claimed,
              reflection: ritual.reflection,
            }}
          />
        </div>
      )}

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 32,
          justifyContent: "center",
        }}
      >
        <Link href="/posts" className="nav-chip">moments</Link>
        <Link href="/songs" className="nav-chip">songs</Link>
        <Link href="/eras" className="nav-chip">eras</Link>
        <Link href="/my-clips" className="nav-chip">your clips</Link>
        <Link href="/wall" className="nav-chip">the wall</Link>
        <Link href="/leaderboard" className="nav-chip">who&rsquo;s carrying</Link>
        <Link href="/diary" className="nav-chip">dusk diary</Link>
        <Link href="/notes" className="nav-chip">voice notes</Link>
        <Link href="/shows" className="nav-chip">shows</Link>
        <Link href="/collection" className="nav-chip">collection</Link>
        <Link href="/rewards" className="nav-chip">rewards</Link>
        {shopifyStore && (
          <Link href="/shop" className="nav-chip">merch</Link>
        )}
        <Link href="/gift" className="nav-chip">gift</Link>
        <Link href="/redemptions" className="nav-chip">redemptions</Link>
        <Link href="/points/buy" className="nav-chip">buy points</Link>
        <Link href="/profile" className="nav-chip">profile</Link>
      </nav>

      {socialLinks.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <FindMeCard
            links={socialLinks.map((l) => ({
              id: l.id,
              kind: l.kind,
              label: l.label,
              url: l.url,
            }))}
          />
        </div>
      )}

      <section style={{ marginTop: 48 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>how to earn</div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 12,
            color: "var(--text-muted)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <li>10 points for every dollar pledged, the moment patreon charges.</li>
          <li>small bonuses at 3, 6, and 12 months of staying.</li>
          <li>a little something on your birthday, and when you bring a friend.</li>
        </ul>
      </section>
    </main>
  );
}

type PreviewPost =
  | (Awaited<ReturnType<typeof prisma.post.findFirst>> & {
      _count: { likes: number };
    })
  | null;

function Landing({ previewPost }: { previewPost: PreviewPost }) {
  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "64px 24px 96px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div className="hero-wash" style={{ height: 560 }} />
      <div className="eyebrow" style={{ marginBottom: 12, color: "var(--accent)" }}>
        copula — ebril&rsquo;s world
      </div>
      <h1 style={{ margin: "0 0 14px", fontSize: 44 }}>
        a small room for the people who live inside the songs.
      </h1>
      <div
        style={{
          fontSize: 13,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 18,
        }}
      >
        free · ios · android
      </div>
      <p
        style={{
          color: "var(--text-muted)",
          margin: "0 auto 36px",
          maxWidth: 420,
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        write what the songs do to you. make clips that carry the album. hear half-minute
        thoughts before anyone else. earn points, keep cassettes, meet at shows.
      </p>
      <Link href="/api/auth/patreon" className="btn">
        come inside
      </Link>
      <div
        style={{
          marginTop: 28,
          color: "var(--text-muted)",
          fontSize: 12,
          letterSpacing: "0.08em",
        }}
      >
        sign in with patreon. nothing is behind a paywall you can&rsquo;t see around.
      </div>

      {/* Free, anonymous things to do before committing. */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link href="/vibe" className="nav-chip">
          take the vibe test
        </Link>
        <Link href="/songs" className="nav-chip">
          read the lyrics
        </Link>
        <Link href="/posts" className="nav-chip">
          see the latest moment
        </Link>
        <Link href="/wall" className="nav-chip">
          the wall
        </Link>
      </div>

      {previewPost && (
        <section style={{ marginTop: 48, textAlign: "left" }}>
          <div
            className="eyebrow"
            style={{
              color: "var(--accent)",
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            a moment from the room
          </div>
          <PostCard
            id={previewPost.id}
            body={previewPost.body}
            imageUrl={previewPost.imageUrl}
            audioUrl={previewPost.audioUrl}
            linkUrl={previewPost.linkUrl}
            linkLabel={previewPost.linkLabel}
            moodTag={previewPost.moodTag}
            publishedAt={previewPost.publishedAt.toISOString()}
            pinned={previewPost.pinned}
            likeCount={previewPost._count.likes}
            liked={false}
            signedIn={false}
          />
        </section>
      )}
    </main>
  );
}
