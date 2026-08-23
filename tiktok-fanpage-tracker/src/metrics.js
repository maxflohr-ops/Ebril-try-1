// Pure engagement math. No I/O here so it stays easy to test and reason about.

export const DAY_MS = 86_400_000;

/* ----------------------------- small stats ---------------------------- */

export const sum = (xs) => xs.reduce((a, b) => a + (b || 0), 0);
export const mean = (xs) => (xs.length ? sum(xs) / xs.length : 0);

export function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
}

/** Safe ratio: returns 0 rather than NaN/Infinity when the base is empty. */
export const ratio = (a, b) => (b > 0 ? a / b : 0);

/**
 * Piecewise-linear 0-100 score.
 * `bands` is [weak, ok, good, excellent]; hitting `good` scores 75.
 */
export function scoreBand(value, [weak, ok, good, excellent]) {
  const v = Number(value) || 0;
  if (v <= 0) return 0;
  const lerp = (lo, hi, outLo, outHi) =>
    outLo + ((Math.min(v, hi) - lo) / (hi - lo)) * (outHi - outLo);
  if (v < weak) return Math.max(0, (v / weak) * 25);
  if (v < ok) return lerp(weak, ok, 25, 50);
  if (v < good) return lerp(ok, good, 50, 75);
  if (v < excellent) return lerp(good, excellent, 75, 95);
  return Math.min(100, 95 + ((v - excellent) / excellent) * 5);
}

/* ---------------------------- benchmarks ------------------------------ */
// Bands are [weak, ok, good, excellent]. Tune these to your niche in one place.
export const BENCHMARKS = {
  engagementRate: [0.03, 0.05, 0.08, 0.12], // (likes+comments+shares) / views
  shareRate: [0.002, 0.005, 0.012, 0.025], // shares / views
  commentRate: [0.0008, 0.002, 0.005, 0.01],
  // Reach ratio is per-post (median views / followers), so it does not drift
  // with the length of the window the way a window total would.
  reachRatio: [0.05, 0.15, 0.5, 1.5],
  medianViews: [1_000, 10_000, 50_000, 250_000],
};

export const SCORE_WEIGHTS = {
  reach: 0.3, // did the page actually put views on the board
  engagement: 0.25, // did those views engage
  amplification: 0.15, // shares — the signal that drives further reach
  reliability: 0.2, // did they post what they agreed to, consistently
  growth: 0.1, // is the page itself growing
};

/* --------------------------- core analysis ---------------------------- */

/**
 * Analyze one page over a rolling window.
 *
 * @param {object} page      row from `pages`
 * @param {Array}  posts     posts with latest metrics attached
 * @param {Array}  snapshots profile snapshots, oldest first
 * @param {object} opts      { windowDays, now }
 */
export function analyzePage(page, posts, snapshots, { windowDays = 30, now = new Date() } = {}) {
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);
  const inWindow = posts.filter((p) => new Date(p.create_time) >= windowStart);

  const views = inWindow.map((p) => p.view_count || 0);
  const likes = inWindow.map((p) => p.like_count || 0);
  const comments = inWindow.map((p) => p.comment_count || 0);
  const shares = inWindow.map((p) => p.share_count || 0);

  const totalViews = sum(views);
  const totalLikes = sum(likes);
  const totalComments = sum(comments);
  const totalShares = sum(shares);
  const totalEngagements = totalLikes + totalComments + totalShares;

  const latestSnap = snapshots.at(-1) || {};
  const followers = latestSnap.follower_count || 0;

  // Follower growth across the window, using the oldest snapshot inside it.
  const windowSnaps = snapshots.filter((s) => new Date(s.captured_at) >= windowStart);
  const baseSnap = windowSnaps[0] || snapshots[0];
  const followerStart = baseSnap?.follower_count || 0;
  const followerDelta = followers - followerStart;
  const followerGrowthPct = ratio(followerDelta, followerStart);

  // Cadence.
  const weeks = windowDays / 7;
  const postsPerWeek = inWindow.length / weeks;
  const expected = page.expected_posts_per_week || 0;
  const reliability = expected > 0 ? Math.min(1, postsPerWeek / expected) : postsPerWeek > 0 ? 1 : 0;

  // Regularity: how evenly spaced the posts are (1 = metronome, 0 = bursty).
  const times = inWindow.map((p) => new Date(p.create_time).getTime()).sort((a, b) => a - b);
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / DAY_MS);
  const regularity = gaps.length >= 2 ? Math.max(0, 1 - ratio(stdev(gaps), mean(gaps))) : gaps.length ? 0.7 : 0;

  const lastPostAt = posts[0]?.create_time || null;
  const daysSinceLastPost = lastPostAt ? (now - new Date(lastPostAt)) / DAY_MS : null;

  // Trend: second half of the window vs the first half.
  //
  // Compared on MEDIAN views per post, and posts younger than MATURITY_DAYS are
  // excluded — a video keeps collecting views for days after it lands, so
  // comparing raw totals makes every healthy page look like it is declining.
  const MATURITY_DAYS = 3;
  const midpoint = new Date(now.getTime() - (windowDays / 2) * DAY_MS);
  const matureCutoff = new Date(now.getTime() - MATURITY_DAYS * DAY_MS);
  const viewsOf = (p) => p.view_count || 0;
  const recentMedian = median(
    inWindow
      .filter((p) => {
        const t = new Date(p.create_time);
        return t >= midpoint && t <= matureCutoff;
      })
      .map(viewsOf)
  );
  const priorMedian = median(
    inWindow.filter((p) => new Date(p.create_time) < midpoint).map(viewsOf)
  );
  const trend = priorMedian > 0 ? recentMedian / priorMedian - 1 : recentMedian > 0 ? 1 : 0;

  const rates = {
    engagementRate: ratio(totalEngagements, totalViews),
    likeRate: ratio(totalLikes, totalViews),
    commentRate: ratio(totalComments, totalViews),
    shareRate: ratio(totalShares, totalViews),
    engagementPerFollower: ratio(totalEngagements, followers),
    viewsPerFollower: ratio(totalViews, followers),
    reachRatio: ratio(median(views), followers),
  };

  const components = {
    reach: scoreBand(median(views), BENCHMARKS.medianViews),
    engagement: scoreBand(rates.engagementRate, BENCHMARKS.engagementRate),
    amplification: scoreBand(rates.shareRate, BENCHMARKS.shareRate),
    reliability: (reliability * 0.7 + regularity * 0.3) * 100,
    growth: growthScore(followerGrowthPct),
  };

  const score = Math.round(
    Object.entries(SCORE_WEIGHTS).reduce((acc, [k, w]) => acc + components[k] * w, 0)
  );

  const analysis = {
    pageId: page.id,
    handle: page.handle,
    displayName: page.display_name || page.handle,
    avatarUrl: page.avatar_url,
    status: page.status,
    source: page.source,
    profileUrl: `https://www.tiktok.com/@${page.handle}`,
    windowDays,
    followers,
    followerDelta,
    followerGrowthPct,
    totalLikesAllTime: latestSnap.likes_count || 0,
    posts: inWindow.length,
    postsPerWeek,
    expectedPostsPerWeek: expected,
    reliability,
    regularity,
    daysSinceLastPost,
    lastPostAt,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalEngagements,
    medianViews: median(views),
    meanViews: mean(views),
    bestViews: views.length ? Math.max(...views) : 0,
    viewsStdev: stdev(views),
    trend,
    ...rates,
    components,
    score,
    grade: gradeFor(score),
    lastSyncAt: page.last_sync_at,
    lastSyncError: page.last_sync_error,
    topPosts: [...inWindow]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map(shapePost),
  };

  analysis.flags = flagsFor(analysis, { now });
  return analysis;
}

function shapePost(p) {
  const engagements = (p.like_count || 0) + (p.comment_count || 0) + (p.share_count || 0);
  return {
    id: p.id,
    createTime: p.create_time,
    title: p.title || p.description || '(no caption)',
    shareUrl: p.share_url,
    coverImageUrl: p.cover_image_url,
    views: p.view_count || 0,
    likes: p.like_count || 0,
    comments: p.comment_count || 0,
    shares: p.share_count || 0,
    engagementRate: ratio(engagements, p.view_count || 0),
  };
}

function growthScore(pct) {
  // Flat is 50; -10%/window bottoms out, +15%/window tops out.
  if (pct >= 0.15) return 100;
  if (pct <= -0.1) return 0;
  return pct >= 0 ? 50 + (pct / 0.15) * 50 : 50 + (pct / 0.1) * 50;
}

export function gradeFor(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Human-readable warnings and wins. Order matters: most urgent first.
 */
export function flagsFor(a, { now = new Date() } = {}) {
  const flags = [];
  const add = (level, label, detail) => flags.push({ level, label, detail });

  if (a.lastSyncError) add('error', 'Sync failed', a.lastSyncError);

  if (a.status === 'active' && a.posts === 0) {
    add('error', 'No posts in window', `Nothing published in the last ${a.windowDays} days.`);
  } else if (a.daysSinceLastPost != null && a.daysSinceLastPost > 14) {
    add('error', 'Gone quiet', `Last post was ${Math.round(a.daysSinceLastPost)} days ago.`);
  }

  if (a.expectedPostsPerWeek > 0 && a.reliability < 0.5 && a.posts > 0) {
    add(
      'warn',
      'Under quota',
      `${a.postsPerWeek.toFixed(1)} posts/week vs ${a.expectedPostsPerWeek} agreed.`
    );
  }

  if (a.posts >= 6 && a.trend <= -0.4) {
    add('warn', 'Reach declining', `Views down ${Math.round(-a.trend * 100)}% vs the prior half.`);
  }
  if (a.posts >= 6 && a.trend >= 0.75) {
    add('good', 'Heating up', `Views up ${Math.round(a.trend * 100)}% vs the prior half.`);
  }

  if (a.totalViews > 50_000 && a.engagementRate < 0.015) {
    add(
      'warn',
      'Engagement looks off',
      `${(a.engagementRate * 100).toFixed(1)}% engagement on ${fmtCompact(a.totalViews)} views — worth checking the traffic is real.`
    );
  }

  if (a.engagementRate >= BENCHMARKS.engagementRate[2]) {
    add('good', 'Strong engagement', `${(a.engagementRate * 100).toFixed(1)}% of views engage.`);
  }
  if (a.shareRate >= BENCHMARKS.shareRate[2]) {
    add('good', 'Highly shareable', `${(a.shareRate * 100).toFixed(2)}% share rate.`);
  }
  if (a.followers > 0 && a.reachRatio >= BENCHMARKS.reachRatio[2]) {
    add(
      'good',
      'Punching above its size',
      `The median post reaches ${a.reachRatio.toFixed(2)}x the page's follower count.`
    );
  }

  if (a.lastSyncAt) {
    const staleDays = (now - new Date(a.lastSyncAt)) / DAY_MS;
    if (staleDays > 3) add('warn', 'Stale data', `Last synced ${Math.round(staleDays)} days ago.`);
  } else {
    add('warn', 'Never synced', 'Run a sync to pull this page in.');
  }

  return flags;
}

export function fmtCompact(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

/* ------------------------------- roster ------------------------------- */

/** Percentile rank of each page on a metric, 0-100. */
export function percentileRanks(analyses, key) {
  const values = analyses.map((a) => a[key] || 0).sort((x, y) => x - y);
  const out = {};
  for (const a of analyses) {
    const v = a[key] || 0;
    const below = values.filter((x) => x < v).length;
    const equal = values.filter((x) => x === v).length;
    out[a.pageId] = values.length ? ((below + equal / 2) / values.length) * 100 : 0;
  }
  return out;
}

export function summarizeRoster(analyses, { windowDays = 30 } = {}) {
  const active = analyses.filter((a) => a.status === 'active');
  const totalViews = sum(analyses.map((a) => a.totalViews));
  const totalEngagements = sum(analyses.map((a) => a.totalEngagements));
  const ranks = percentileRanks(analyses, 'score');

  for (const a of analyses) a.percentile = Math.round(ranks[a.pageId]);

  const byScore = [...analyses].sort((a, b) => b.score - a.score);
  return {
    windowDays,
    pages: analyses.length,
    activePages: active.length,
    totalViews,
    totalEngagements,
    totalPosts: sum(analyses.map((a) => a.posts)),
    totalFollowers: sum(analyses.map((a) => a.followers)),
    followerDelta: sum(analyses.map((a) => a.followerDelta)),
    avgEngagementRate: ratio(totalEngagements, totalViews),
    medianScore: median(analyses.map((a) => a.score)),
    needsAttention: analyses.filter((a) => a.flags.some((f) => f.level === 'error')).length,
    topPerformers: byScore.slice(0, 3).map((a) => ({ handle: a.handle, score: a.score })),
    bottomPerformers: byScore
      .slice(-3)
      .reverse()
      .map((a) => ({ handle: a.handle, score: a.score })),
  };
}
