// End-to-end check of the HTTP layer against a throwaway database.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The database path is read when src/config.js is first evaluated, so it has to
// be set before any of the app modules are imported.
const dir = mkdtempSync(join(tmpdir(), 'fanpage-test-'));
process.env.DB_PATH = join(dir, 'test.db');

const { createApp } = await import('../src/server.js');
const { seedDemoData } = await import('../src/demo.js');
const { closeDb } = await import('../src/db.js');

let server;
let base;

before(async () => {
  seedDemoData();
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

test('GET /api/report returns a ranked roster', async () => {
  const { status, body } = await get('/api/report?window=30');
  assert.equal(status, 200);
  assert.ok(body.pages.length >= 8);
  assert.ok(body.summary.totalViews > 0);
  // Sorted best-first.
  for (let i = 1; i < body.pages.length; i++) {
    assert.ok(body.pages[i - 1].score >= body.pages[i].score);
  }
});

test('the window parameter changes the numbers', async () => {
  const week = await get('/api/report?window=7');
  const month = await get('/api/report?window=30');
  assert.ok(week.body.summary.totalPosts < month.body.summary.totalPosts);
  assert.equal(week.body.summary.windowDays, 7);
});

test('an out-of-range window is clamped rather than trusted', async () => {
  const { body } = await get('/api/report?window=99999');
  assert.equal(body.summary.windowDays, 365);
});

test('page detail includes the series the drawer draws', async () => {
  const { body } = await get('/api/report?window=30');
  const first = body.pages[0];
  const { status, body: detail } = await get(`/api/pages/${first.pageId}?window=30`);
  assert.equal(status, 200);
  assert.equal(detail.handle, first.handle);
  assert.equal(detail.dailyViews.length, 30);
  assert.ok(detail.followerSeries.length > 0);
  assert.ok(Number.isInteger(detail.percentile));
});

test('unknown pages 404 instead of throwing', async () => {
  const { status } = await get('/api/pages/does-not-exist');
  assert.equal(status, 404);
});

test('pages can be added, patched and removed', async () => {
  const created = await fetch(`${base}/api/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: '@brandnewpage', expected_posts_per_week: 3 }),
  });
  assert.equal(created.status, 201);
  const { page } = await created.json();
  assert.equal(page.handle, 'brandnewpage');

  const duplicate = await fetch(`${base}/api/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: 'brandnewpage' }),
  });
  assert.equal(duplicate.status, 409);

  const patched = await fetch(`${base}/api/pages/${page.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'paused', notes: 'hold', id: 'hijack-attempt' }),
  });
  const { page: updated } = await patched.json();
  assert.equal(updated.status, 'paused');
  assert.equal(updated.notes, 'hold');
  assert.equal(updated.id, page.id, 'id must not be patchable');

  const removed = await fetch(`${base}/api/pages/${page.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal((await get(`/api/pages/${page.id}`)).status, 404);
});

test('syncing an unconnected page fails without throwing', async () => {
  const created = await fetch(`${base}/api/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: 'unconnectedpage' }),
  });
  const { page } = await created.json();
  const res = await fetch(`${base}/api/pages/${page.id}/sync`, { method: 'POST' });
  const result = await res.json();
  assert.equal(res.status, 200);
  assert.equal(result.ok, false);
  assert.match(result.error, /not connected/i);
});

test('static assets are served and traversal is refused', async () => {
  const index = await fetch(base + '/');
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /text\/html/);

  const escape = await fetch(base + '/../package.json');
  assert.notEqual(escape.status, 200);
});
