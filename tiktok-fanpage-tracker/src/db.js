// SQLite storage layer, built on Node's bundled node:sqlite (Node >= 22.5).
import { config } from './config.js'; // imported first: it silences the node:sqlite warning
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

let db;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pages (
  id                     TEXT PRIMARY KEY,      -- TikTok open_id, or slug for unconnected pages
  handle                 TEXT NOT NULL,         -- @username, stored without the @
  display_name           TEXT,
  avatar_url             TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',  -- active | paused | dropped
  source                 TEXT NOT NULL DEFAULT 'display_api', -- display_api | research_api | manual
  joined_at              TEXT,
  expected_posts_per_week REAL NOT NULL DEFAULT 5,
  notes                  TEXT,
  access_token           TEXT,
  refresh_token          TEXT,
  token_expires_at       TEXT,
  refresh_expires_at     TEXT,
  scopes                 TEXT,
  connected_at           TEXT,
  last_sync_at           TEXT,
  last_sync_error        TEXT,
  created_at             TEXT NOT NULL
);

-- Profile-level time series: one row per page per sync.
CREATE TABLE IF NOT EXISTS snapshots (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id        TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  captured_at    TEXT NOT NULL,
  follower_count INTEGER,
  following_count INTEGER,
  likes_count    INTEGER,
  video_count    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_snapshots_page_time ON snapshots(page_id, captured_at);

CREATE TABLE IF NOT EXISTS posts (
  id              TEXT PRIMARY KEY,            -- TikTok video id
  page_id         TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  create_time     TEXT NOT NULL,               -- ISO8601, when the video was posted
  title           TEXT,
  description     TEXT,
  share_url       TEXT,
  cover_image_url TEXT,
  duration        INTEGER,
  first_seen_at   TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_page_time ON posts(page_id, create_time);

-- Per-post time series: one row per post per sync.
CREATE TABLE IF NOT EXISTS post_metrics (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id       TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  captured_at   TEXT NOT NULL,
  view_count    INTEGER NOT NULL DEFAULT 0,
  like_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_post_metrics_post_time ON post_metrics(post_id, captured_at);

-- Short-lived CSRF state for the OAuth handshake.
CREATE TABLE IF NOT EXISTS oauth_states (
  state      TEXT PRIMARY KEY,
  handle     TEXT,
  created_at TEXT NOT NULL
);
`;

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(config.dbPath), { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

export const nowIso = () => new Date().toISOString();

/* ------------------------------- pages -------------------------------- */

export function upsertPage(page) {
  const d = getDb();
  const existing = d.prepare('SELECT id FROM pages WHERE id = ?').get(page.id);
  if (existing) {
    const fields = Object.keys(page).filter((k) => k !== 'id');
    if (!fields.length) return;
    d.prepare(
      `UPDATE pages SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`
    ).run(...fields.map((f) => page[f]), page.id);
    return;
  }
  const row = {
    display_name: null,
    avatar_url: null,
    status: 'active',
    source: 'display_api',
    joined_at: nowIso(),
    expected_posts_per_week: 5,
    notes: null,
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
    refresh_expires_at: null,
    scopes: null,
    connected_at: null,
    last_sync_at: null,
    last_sync_error: null,
    created_at: nowIso(),
    ...page,
  };
  const cols = Object.keys(row);
  d.prepare(
    `INSERT INTO pages (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  ).run(...cols.map((c) => row[c]));
}

export function getPage(id) {
  return getDb().prepare('SELECT * FROM pages WHERE id = ?').get(id);
}

export function getPageByHandle(handle) {
  return getDb()
    .prepare('SELECT * FROM pages WHERE handle = ? COLLATE NOCASE')
    .get(String(handle).replace(/^@/, ''));
}

export function listPages({ includeDropped = true } = {}) {
  const sql = includeDropped
    ? 'SELECT * FROM pages ORDER BY handle'
    : "SELECT * FROM pages WHERE status != 'dropped' ORDER BY handle";
  return getDb().prepare(sql).all();
}

export function deletePage(id) {
  // post_metrics hangs off posts, which cascades from pages.
  const d = getDb();
  d.prepare(
    'DELETE FROM post_metrics WHERE post_id IN (SELECT id FROM posts WHERE page_id = ?)'
  ).run(id);
  d.prepare('DELETE FROM pages WHERE id = ?').run(id);
}

/* ----------------------------- snapshots ------------------------------ */

export function insertSnapshot(pageId, stats, capturedAt = nowIso()) {
  getDb()
    .prepare(
      `INSERT INTO snapshots (page_id, captured_at, follower_count, following_count, likes_count, video_count)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      pageId,
      capturedAt,
      stats.follower_count ?? null,
      stats.following_count ?? null,
      stats.likes_count ?? null,
      stats.video_count ?? null
    );
}

export function listSnapshots(pageId, sinceIso) {
  const d = getDb();
  return sinceIso
    ? d
        .prepare(
          'SELECT * FROM snapshots WHERE page_id = ? AND captured_at >= ? ORDER BY captured_at'
        )
        .all(pageId, sinceIso)
    : d
        .prepare('SELECT * FROM snapshots WHERE page_id = ? ORDER BY captured_at')
        .all(pageId);
}

/* ------------------------------- posts -------------------------------- */

export function upsertPost(post) {
  const d = getDb();
  const seen = nowIso();
  d.prepare(
    `INSERT INTO posts (id, page_id, create_time, title, description, share_url,
                        cover_image_url, duration, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       share_url = excluded.share_url,
       cover_image_url = excluded.cover_image_url,
       duration = excluded.duration,
       last_seen_at = excluded.last_seen_at`
  ).run(
    post.id,
    post.page_id,
    post.create_time,
    post.title ?? null,
    post.description ?? null,
    post.share_url ?? null,
    post.cover_image_url ?? null,
    post.duration ?? null,
    post.first_seen_at ?? seen,
    seen
  );
}

export function insertPostMetrics(postId, metrics, capturedAt = nowIso()) {
  getDb()
    .prepare(
      `INSERT INTO post_metrics (post_id, captured_at, view_count, like_count, comment_count, share_count)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      postId,
      capturedAt,
      metrics.view_count ?? 0,
      metrics.like_count ?? 0,
      metrics.comment_count ?? 0,
      metrics.share_count ?? 0
    );
}

/**
 * Posts for a page with their most recent metric reading attached.
 * `sinceIso` filters on when the video was posted, not when it was measured.
 */
export function listPostsWithLatestMetrics(pageId, sinceIso) {
  const params = [pageId];
  let where = 'p.page_id = ?';
  if (sinceIso) {
    where += ' AND p.create_time >= ?';
    params.push(sinceIso);
  }
  return getDb()
    .prepare(
      `SELECT p.*, m.view_count, m.like_count, m.comment_count, m.share_count, m.captured_at
       FROM posts p
       LEFT JOIN (
         SELECT pm.* FROM post_metrics pm
         JOIN (
           SELECT post_id, MAX(captured_at) AS captured_at
           FROM post_metrics GROUP BY post_id
         ) latest ON latest.post_id = pm.post_id AND latest.captured_at = pm.captured_at
         GROUP BY pm.post_id
       ) m ON m.post_id = p.id
       WHERE ${where}
       ORDER BY p.create_time DESC`
    )
    .all(...params);
}

/* ---------------------------- oauth states ---------------------------- */

export function createOauthState(state, handle) {
  getDb()
    .prepare('INSERT INTO oauth_states (state, handle, created_at) VALUES (?, ?, ?)')
    .run(state, handle ?? null, nowIso());
}

export function consumeOauthState(state) {
  const d = getDb();
  const row = d.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);
  if (row) d.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
  // Opportunistically drop states older than an hour.
  d.prepare("DELETE FROM oauth_states WHERE created_at < datetime('now', '-1 hour')").run();
  return row;
}
