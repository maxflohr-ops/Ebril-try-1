// Seeds a realistic-looking roster so you can use the dashboard before the
// TikTok app credentials are approved. Deterministic: same data every run.
import { getDb, upsertPage, insertSnapshot, upsertPost, insertPostMetrics } from './db.js';
import { DAY_MS } from './metrics.js';

// Small deterministic PRNG (mulberry32) so demo data is reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROFILES = [
  // handle,            followers, base views, engagement, posts/wk, quota, growth, story
  ['ebril.daily',        184_000, 92_000,  0.105, 6.2, 6, 0.06, 'consistent top performer'],
  ['ebrilclips',          96_500, 41_000,  0.088, 5.1, 5, 0.03, 'solid mid-tier'],
  ['ebrilvault',         312_000, 210_000, 0.121, 4.4, 4, 0.09, 'biggest reach on the roster'],
  ['ebril.edits',         42_300, 12_500,  0.072, 7.8, 5, 0.02, 'high volume, lower quality'],
  ['ebrilhq',             28_900, 6_400,   0.061, 1.4, 5, -0.01, 'under quota, slipping'],
  ['ebrilfanpage_',      118_000, 55_000,  0.014, 3.0, 4, 0.00, 'views do not match engagement'],
  ['ebril.updates',       61_200, 23_800,  0.094, 4.9, 4, 0.04, 'steady'],
  ['ebrilarchive',        15_400, 3_100,   0.083, 0.3, 3, -0.03, 'gone quiet'],
];

const CAPTIONS = [
  'this part never gets old 😭',
  'the way he said it though',
  'part 4 — full thing on the main page',
  'nobody talks about this moment',
  'okay but the outro is insane',
  'rewatch value is crazy',
  'tell me you saw this coming',
  'this one broke me',
  'first time hearing it??',
  'the transition at 0:14',
];

export function seedDemoData({ days = 60, now = new Date() } = {}) {
  const db = getDb();
  db.exec('BEGIN');
  try {
    PROFILES.forEach((profile, idx) => {
      const [handle, followers, baseViews, engRate, postsPerWeek, quota, growth, note] = profile;
      const rand = rng(1000 + idx * 77);
      const pageId = `demo_${handle.replace(/[^a-z0-9]/gi, '_')}`;

      upsertPage({
        id: pageId,
        handle,
        display_name: handle.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        avatar_url: null,
        status: 'active',
        source: 'display_api',
        joined_at: new Date(now.getTime() - (120 + idx * 9) * DAY_MS).toISOString(),
        expected_posts_per_week: quota,
        notes: `Demo page — ${note}.`,
        connected_at: new Date(now.getTime() - 90 * DAY_MS).toISOString(),
        last_sync_at: now.toISOString(),
        last_sync_error: null,
        scopes: 'user.info.basic,user.info.stats,video.list',
      });

      // Weekly follower snapshots trending toward the current count.
      const totalGrowth = growth * (days / 30);
      for (let d = days; d >= 0; d -= 7) {
        const progress = 1 - d / days;
        const wobble = 1 + (rand() - 0.5) * 0.01;
        const count = Math.round(
          (followers / (1 + totalGrowth)) * (1 + totalGrowth * progress) * wobble
        );
        insertSnapshot(
          pageId,
          {
            follower_count: count,
            following_count: 60 + Math.floor(rand() * 200),
            likes_count: Math.round(count * (8 + rand() * 6)),
            video_count: 200 + Math.floor(progress * postsPerWeek * (days / 7)),
          },
          new Date(now.getTime() - d * DAY_MS).toISOString()
        );
      }

      // Posts spread across the window, with a couple of breakouts and a
      // second-half slowdown for the pages whose story calls for it.
      const totalPosts = Math.round((postsPerWeek * days) / 7);
      for (let i = 0; i < totalPosts; i++) {
        const progress = i / Math.max(1, totalPosts - 1);
        let ageDays = days - progress * days;
        // "gone quiet" pages stop posting partway through.
        if (note.includes('quiet') && ageDays < 21) continue;
        if (note.includes('slipping') && ageDays < 30 && rand() < 0.55) continue;
        ageDays = Math.max(0.2, ageDays + (rand() - 0.5) * 1.5);

        const createdAt = new Date(now.getTime() - ageDays * DAY_MS);
        // Log-normal-ish view distribution: most posts modest, rare breakouts.
        const roll = rand();
        const multiplier = roll > 0.94 ? 4 + rand() * 9 : roll > 0.7 ? 1.2 + rand() : 0.25 + rand();
        // Newer posts have had less time to accumulate views.
        const maturity = Math.min(1, ageDays / 5 + 0.25);
        const views = Math.max(120, Math.round(baseViews * multiplier * maturity));

        const er = Math.max(0.004, engRate * (0.75 + rand() * 0.5));
        const engagements = Math.round(views * er);
        const likes = Math.round(engagements * 0.87);
        const comments = Math.round(engagements * 0.05);
        const shares = Math.max(0, engagements - likes - comments);

        const postId = `demo_${pageId}_${i}`;
        upsertPost({
          id: postId,
          page_id: pageId,
          create_time: createdAt.toISOString(),
          title: CAPTIONS[Math.floor(rand() * CAPTIONS.length)],
          description: null,
          share_url: `https://www.tiktok.com/@${handle}/video/${7000000000000000000 + i}`,
          cover_image_url: null,
          duration: 12 + Math.floor(rand() * 45),
        });
        insertPostMetrics(
          postId,
          { view_count: views, like_count: likes, comment_count: comments, share_count: shares },
          now.toISOString()
        );
      }
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return PROFILES.length;
}

export function clearDemoData() {
  const db = getDb();
  db.exec("DELETE FROM post_metrics WHERE post_id LIKE 'demo_%'");
  db.exec("DELETE FROM posts WHERE page_id LIKE 'demo_%'");
  db.exec("DELETE FROM snapshots WHERE page_id LIKE 'demo_%'");
  db.exec("DELETE FROM pages WHERE id LIKE 'demo_%'");
}
