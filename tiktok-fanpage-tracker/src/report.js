// Turns stored rows into the report the dashboard and CLI render.
import { listPages, getPage, listSnapshots, listPostsWithLatestMetrics } from './db.js';
import { analyzePage, summarizeRoster, DAY_MS } from './metrics.js';

export function buildReport({ windowDays = 30, includeDropped = false, now = new Date() } = {}) {
  const pages = listPages({ includeDropped });
  const analyses = pages.map((page) =>
    analyzePage(page, listPostsWithLatestMetrics(page.id), listSnapshots(page.id), {
      windowDays,
      now,
    })
  );
  analyses.sort((a, b) => b.score - a.score);
  return {
    generatedAt: now.toISOString(),
    summary: summarizeRoster(analyses, { windowDays }),
    pages: analyses,
  };
}

export function buildPageDetail(pageId, { windowDays = 30, now = new Date() } = {}) {
  const page = getPage(pageId);
  if (!page) return null;

  const posts = listPostsWithLatestMetrics(page.id);
  const snapshots = listSnapshots(page.id);

  // Run the full roster so this page carries its percentile rank, the same
  // number the table shows.
  const roster = buildReport({ windowDays, includeDropped: true, now });
  const analysis =
    roster.pages.find((p) => p.pageId === page.id) ||
    analyzePage(page, posts, snapshots, { windowDays, now });

  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);
  return {
    ...analysis,
    notes: page.notes,
    joinedAt: page.joined_at,
    connectedAt: page.connected_at,
    followerSeries: snapshots
      .filter((s) => new Date(s.captured_at) >= windowStart)
      .map((s) => ({ t: s.captured_at, followers: s.follower_count || 0 })),
    dailyViews: dailyViewSeries(posts, windowDays, now),
    allPosts: posts
      .filter((p) => new Date(p.create_time) >= windowStart)
      .map((p) => ({
        id: p.id,
        createTime: p.create_time,
        title: p.title || p.description || '(no caption)',
        shareUrl: p.share_url,
        coverImageUrl: p.cover_image_url,
        views: p.view_count || 0,
        likes: p.like_count || 0,
        comments: p.comment_count || 0,
        shares: p.share_count || 0,
        engagementRate:
          (p.view_count || 0) > 0
            ? ((p.like_count || 0) + (p.comment_count || 0) + (p.share_count || 0)) /
              p.view_count
            : 0,
      })),
  };
}

/** Views attributed to the day each video was posted — the shape of their output. */
function dailyViewSeries(posts, windowDays, now) {
  const buckets = new Map();
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    buckets.set(day, { t: day, views: 0, posts: 0 });
  }
  for (const p of posts) {
    const day = new Date(p.create_time).toISOString().slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    bucket.views += p.view_count || 0;
    bucket.posts += 1;
  }
  return [...buckets.values()];
}
