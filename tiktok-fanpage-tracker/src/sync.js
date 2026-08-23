// Pull fresh numbers from TikTok into the local database.
import {
  getDb,
  listPages,
  getPage,
  upsertPage,
  insertSnapshot,
  upsertPost,
  insertPostMetrics,
  nowIso,
} from './db.js';
import {
  fetchUserInfo,
  fetchVideos,
  refreshAccessToken,
  researchVideosByUsername,
  TikTokApiError,
} from './tiktok.js';
import { config } from './config.js';

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Returns a usable access token for the page, refreshing it if it is close to expiry. */
export async function ensureAccessToken(page) {
  if (!page.access_token) {
    throw new TikTokApiError(`@${page.handle} has not connected their account yet`, {
      code: 'not_connected',
    });
  }
  const expiresAt = page.token_expires_at ? Date.parse(page.token_expires_at) : 0;
  if (expiresAt - REFRESH_MARGIN_MS > Date.now()) return page.access_token;

  if (!page.refresh_token) {
    throw new TikTokApiError(`@${page.handle} needs to reconnect (no refresh token)`, {
      code: 'invalid_grant',
    });
  }
  const t = await refreshAccessToken(page.refresh_token);
  upsertPage({
    id: page.id,
    access_token: t.accessToken,
    refresh_token: t.refreshToken || page.refresh_token,
    token_expires_at: t.tokenExpiresAt,
    refresh_expires_at: t.refreshExpiresAt,
  });
  return t.accessToken;
}

function toIso(createTime) {
  // TikTok returns create_time as unix seconds.
  if (createTime == null) return nowIso();
  const n = Number(createTime);
  return Number.isFinite(n) ? new Date(n * 1000).toISOString() : new Date(createTime).toISOString();
}

function storeVideos(pageId, videos, capturedAt) {
  const db = getDb();
  db.exec('BEGIN');
  try {
    for (const v of videos) {
      if (!v.id) continue;
      upsertPost({
        id: String(v.id),
        page_id: pageId,
        create_time: toIso(v.create_time),
        title: v.title || null,
        description: v.video_description || null,
        share_url: v.share_url || null,
        cover_image_url: v.cover_image_url || null,
        duration: v.duration ?? null,
      });
      insertPostMetrics(
        String(v.id),
        {
          view_count: v.view_count ?? 0,
          like_count: v.like_count ?? 0,
          comment_count: v.comment_count ?? 0,
          share_count: v.share_count ?? 0,
        },
        capturedAt
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Sync one page. Never throws — failures are recorded on the page row. */
export async function syncPage(pageId, { videoLimit = config.syncVideoLimit } = {}) {
  const page = getPage(pageId);
  if (!page) return { pageId, ok: false, error: 'page not found' };

  const capturedAt = nowIso();
  try {
    let videos;

    if (page.source === 'research_api') {
      videos = await researchVideosByUsername(page.handle, { limit: videoLimit });
    } else {
      const token = await ensureAccessToken(page);
      const user = await fetchUserInfo(token);
      insertSnapshot(
        page.id,
        {
          follower_count: user.follower_count,
          following_count: user.following_count,
          likes_count: user.likes_count,
          video_count: user.video_count,
        },
        capturedAt
      );
      upsertPage({
        id: page.id,
        display_name: user.display_name ?? page.display_name,
        avatar_url: user.avatar_url ?? page.avatar_url,
      });
      videos = await fetchVideos(token, { limit: videoLimit });
    }

    storeVideos(page.id, videos, capturedAt);
    upsertPage({ id: page.id, last_sync_at: capturedAt, last_sync_error: null });
    return { pageId, handle: page.handle, ok: true, videos: videos.length };
  } catch (err) {
    const message = err instanceof TikTokApiError ? `${err.code || err.status}: ${err.message}` : err.message;
    upsertPage({ id: page.id, last_sync_at: capturedAt, last_sync_error: message });
    return { pageId, handle: page.handle, ok: false, error: message };
  }
}

/** Sync the whole roster, a few pages at a time to stay inside rate limits. */
export async function syncAll({ concurrency = 3, includeDropped = false, onProgress } = {}) {
  const pages = listPages({ includeDropped });
  const results = [];
  const queue = [...pages];

  const worker = async () => {
    while (queue.length) {
      const page = queue.shift();
      const result = await syncPage(page.id);
      results.push(result);
      onProgress?.(result, results.length, pages.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}
