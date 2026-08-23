// Zero-dependency HTTP server: static dashboard + JSON API + OAuth callback.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import { config, ROOT } from './config.js';
import {
  getDb,
  listPages,
  getPage,
  getPageByHandle,
  upsertPage,
  deletePage,
  createOauthState,
  consumeOauthState,
  nowIso,
} from './db.js';
import { buildReport, buildPageDetail } from './report.js';
import { syncAll, syncPage } from './sync.js';
import { buildAuthorizeUrl, exchangeCodeForToken, fetchUserInfo } from './tiktok.js';
import { seedDemoData, clearDemoData } from './demo.js';

const PUBLIC_DIR = join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
};

const html = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
};

async function readJsonBody(req, limit = 1e6) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Serve files from public/, refusing anything that escapes the directory. */
async function serveStatic(res, urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, rel === '/' || rel === '.' ? 'index.html' : rel);
  if (!filePath.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Content-Length': body.length,
    });
    res.end(body);
  } catch {
    json(res, 404, { error: 'not found' });
  }
}

const handleFromDeepLink = (link) => link?.match(/@([\w.-]+)/)?.[1] || null;

/* ------------------------------- routes ------------------------------- */

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const windowDays = Math.min(365, Math.max(1, Number(searchParams.get('window')) || 30));
  const includeDropped = searchParams.get('includeDropped') === 'true';
  const pageMatch = pathname.match(/^\/api\/pages\/([^/]+)(\/sync)?$/);

  if (pathname === '/api/config' && req.method === 'GET') {
    return json(res, 200, {
      credentialsConfigured: Boolean(config.clientKey && config.clientSecret),
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      researchEnabled: config.researchEnabled,
      pageCount: listPages().length,
    });
  }

  if (pathname === '/api/report' && req.method === 'GET') {
    return json(res, 200, buildReport({ windowDays, includeDropped }));
  }

  if (pathname === '/api/pages' && req.method === 'GET') {
    return json(res, 200, { pages: listPages({ includeDropped: true }) });
  }

  // Add a page manually (before or without an OAuth connection).
  if (pathname === '/api/pages' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const handle = String(body.handle || '').replace(/^@/, '').trim();
    if (!handle) return json(res, 400, { error: 'handle is required' });
    if (getPageByHandle(handle)) return json(res, 409, { error: `@${handle} is already tracked` });

    const id = body.id || `pending_${handle.toLowerCase()}`;
    upsertPage({
      id,
      handle,
      display_name: body.display_name || handle,
      status: body.status || 'active',
      source: body.source === 'research_api' ? 'research_api' : 'display_api',
      expected_posts_per_week: Number(body.expected_posts_per_week ?? 5),
      notes: body.notes || null,
      joined_at: body.joined_at || nowIso(),
    });
    return json(res, 201, { page: getPage(id), connectUrl: `/connect?handle=${encodeURIComponent(handle)}` });
  }

  if (pageMatch) {
    const pageId = decodeURIComponent(pageMatch[1]);
    const isSync = Boolean(pageMatch[2]);

    if (isSync && req.method === 'POST') {
      return json(res, 200, await syncPage(pageId));
    }
    if (!isSync && req.method === 'GET') {
      const detail = buildPageDetail(pageId, { windowDays });
      return detail ? json(res, 200, detail) : json(res, 404, { error: 'page not found' });
    }
    if (!isSync && req.method === 'PATCH') {
      if (!getPage(pageId)) return json(res, 404, { error: 'page not found' });
      const body = await readJsonBody(req);
      const allowed = ['status', 'notes', 'expected_posts_per_week', 'display_name', 'handle'];
      const patch = { id: pageId };
      for (const key of allowed) if (key in body) patch[key] = body[key];
      upsertPage(patch);
      return json(res, 200, { page: getPage(pageId) });
    }
    if (!isSync && req.method === 'DELETE') {
      deletePage(pageId);
      return json(res, 200, { ok: true });
    }
  }

  if (pathname === '/api/sync' && req.method === 'POST') {
    const results = await syncAll();
    return json(res, 200, {
      synced: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
      results,
    });
  }

  if (pathname === '/api/demo' && req.method === 'POST') {
    const body = await readJsonBody(req);
    if (body.clear) {
      clearDemoData();
      return json(res, 200, { ok: true, cleared: true });
    }
    return json(res, 200, { ok: true, seeded: seedDemoData() });
  }

  return json(res, 404, { error: 'unknown endpoint' });
}

/** Kicks off the OAuth handshake for a fan page. Share this link with them. */
function handleConnect(res, url) {
  if (!config.clientKey || !config.clientSecret) {
    return html(
      res,
      500,
      page(
        'Not configured',
        `<p>Add <code>TIKTOK_CLIENT_KEY</code> and <code>TIKTOK_CLIENT_SECRET</code> to
         <code>.env</code>, then restart the server.</p>`
      )
    );
  }
  const handle = url.searchParams.get('handle')?.replace(/^@/, '') || null;
  const { url: authorizeUrl, state } = buildAuthorizeUrl(randomBytes(16).toString('hex'));
  createOauthState(state, handle);
  res.writeHead(302, { Location: authorizeUrl, 'Cache-Control': 'no-store' });
  res.end();
}

async function handleOauthCallback(res, url) {
  const error = url.searchParams.get('error');
  if (error) {
    return html(
      res,
      400,
      page('Connection cancelled', `<p>TikTok returned: <code>${escapeHtml(error)}</code></p>`)
    );
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return html(res, 400, page('Missing code', '<p>Invalid callback.</p>'));

  const stored = consumeOauthState(state);
  if (!stored) {
    return html(
      res,
      400,
      page('Expired link', '<p>That connect link expired. Ask for a fresh one and try again.</p>')
    );
  }

  try {
    const token = await exchangeCodeForToken(code);
    const user = await fetchUserInfo(token.accessToken);
    const handle =
      stored.handle || handleFromDeepLink(user.profile_deep_link) || token.openId.slice(0, 12);

    // If the page was pre-added by handle, migrate it onto the real open_id.
    const existing = getPageByHandle(handle);
    if (existing && existing.id !== token.openId) {
      const db = getDb();
      db.prepare('UPDATE pages SET id = ? WHERE id = ?').run(token.openId, existing.id);
      db.prepare('UPDATE posts SET page_id = ? WHERE page_id = ?').run(token.openId, existing.id);
      db.prepare('UPDATE snapshots SET page_id = ? WHERE page_id = ?').run(token.openId, existing.id);
    }

    upsertPage({
      id: token.openId,
      handle,
      display_name: user.display_name || handle,
      avatar_url: user.avatar_url || null,
      status: existing?.status || 'active',
      source: 'display_api',
      expected_posts_per_week: existing?.expected_posts_per_week ?? 5,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      token_expires_at: token.tokenExpiresAt,
      refresh_expires_at: token.refreshExpiresAt,
      scopes: token.scope,
      connected_at: nowIso(),
      last_sync_error: null,
    });

    // Pull their numbers immediately so the dashboard is populated.
    await syncPage(token.openId);

    return html(
      res,
      200,
      page(
        'Connected',
        `<p><strong>@${escapeHtml(handle)}</strong> is now linked. You can close this tab.</p>
         <p class="muted">Revoke any time in TikTok: Settings → Security → Manage app permissions.</p>`
      )
    );
  } catch (err) {
    return html(
      res,
      500,
      page('Connection failed', `<p><code>${escapeHtml(err.message)}</code></p>`)
    );
  }
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const page = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;background:#0e0e12;color:#f2f2f5;
       display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
  .card{max-width:32rem;background:#17171e;border:1px solid #2a2a35;border-radius:16px;padding:32px}
  h1{margin:0 0 12px;font-size:1.4rem}
  code{background:#25252f;padding:2px 6px;border-radius:4px;font-size:.9em}
  .muted{color:#9a9aa8;font-size:.9rem}
  a{color:#25f4ee}
</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1>${body}
<p><a href="/">Back to the dashboard</a></p></div></body></html>`;

/* ------------------------------- server ------------------------------- */

export function createApp() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      if (url.pathname === '/connect') return handleConnect(res, url);
      if (url.pathname === '/oauth/callback') return await handleOauthCallback(res, url);
      return await serveStatic(res, url.pathname);
    } catch (err) {
      console.error(`[error] ${req.method} ${url.pathname}:`, err.message);
      if (!res.headersSent) json(res, 500, { error: err.message });
      else res.end();
    }
  });
}

export function startServer({ port = config.port } = {}) {
  getDb();
  const server = createApp();
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`\n  TikTok fanpage tracker → http://localhost:${port}\n`);
      if (!config.clientKey) {
        console.log('  No TikTok credentials yet. Run `node bin/tracker.js demo` to');
        console.log('  populate the dashboard with sample data in the meantime.\n');
      }
      resolve(server);
    });
  });
}
