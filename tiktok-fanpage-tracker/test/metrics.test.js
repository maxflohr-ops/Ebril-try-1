import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePage,
  flagsFor,
  gradeFor,
  median,
  percentileRanks,
  scoreBand,
  stdev,
  summarizeRoster,
  DAY_MS,
} from '../src/metrics.js';

const NOW = new Date('2026-06-01T00:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS).toISOString();

const page = (over = {}) => ({
  id: 'p1',
  handle: 'testpage',
  display_name: 'Test Page',
  status: 'active',
  source: 'display_api',
  expected_posts_per_week: 5,
  last_sync_at: NOW.toISOString(),
  ...over,
});

const post = (ageDays, views, engagementRate = 0.08) => ({
  id: `v${ageDays}_${views}`,
  create_time: daysAgo(ageDays),
  view_count: views,
  like_count: Math.round(views * engagementRate * 0.87),
  comment_count: Math.round(views * engagementRate * 0.05),
  share_count: Math.round(views * engagementRate * 0.08),
});

test('median handles even and odd lengths', () => {
  assert.equal(median([]), 0);
  assert.equal(median([5]), 5);
  assert.equal(median([1, 3]), 2);
  assert.equal(median([9, 1, 5]), 5);
});

test('stdev needs at least two samples', () => {
  assert.equal(stdev([4]), 0);
  assert.ok(Math.abs(stdev([2, 4, 4, 4, 5, 5, 7, 9]) - 2.138) < 0.01);
});

test('scoreBand maps the band edges to the documented anchors', () => {
  const bands = [10, 20, 40, 80];
  assert.equal(scoreBand(0, bands), 0);
  assert.equal(scoreBand(10, bands), 25);
  assert.equal(scoreBand(20, bands), 50);
  assert.equal(scoreBand(40, bands), 75);
  assert.equal(scoreBand(80, bands), 95);
  assert.ok(scoreBand(1000, bands) <= 100);
});

test('grades follow the score thresholds', () => {
  assert.equal(gradeFor(90), 'A');
  assert.equal(gradeFor(70), 'B');
  assert.equal(gradeFor(55), 'C');
  assert.equal(gradeFor(40), 'D');
  assert.equal(gradeFor(39), 'F');
});

test('engagement rates are computed against views, not followers', () => {
  const posts = [post(5, 1000), post(10, 1000)];
  const a = analyzePage(page(), posts, [{ captured_at: daysAgo(30), follower_count: 500 }], {
    now: NOW,
  });
  assert.equal(a.totalViews, 2000);
  assert.ok(Math.abs(a.engagementRate - 0.08) < 0.005);
  // Same engagements measured against a much smaller follower base.
  assert.ok(a.engagementPerFollower > a.engagementRate);
});

test('a page with no views never produces NaN or Infinity', () => {
  const a = analyzePage(page(), [], [], { now: NOW });
  for (const key of ['engagementRate', 'shareRate', 'reachRatio', 'score', 'trend']) {
    assert.ok(Number.isFinite(a[key]), `${key} should be finite, got ${a[key]}`);
  }
  assert.equal(a.score >= 0, true);
});

test('trend ignores posts too fresh to have accumulated views', () => {
  // Steady 10k performance, plus a one-day-old post that has only 200 views.
  const steady = [post(28, 10_000), post(24, 10_000), post(20, 10_000), post(16, 10_000)];
  const recent = [post(12, 10_000), post(9, 10_000), post(6, 10_000), post(4, 10_000)];
  const brandNew = [post(1, 200), post(0.5, 150)];

  const a = analyzePage(page(), [...brandNew, ...recent, ...steady], [], { now: NOW });
  assert.ok(
    Math.abs(a.trend) < 0.05,
    `flat performance should read as flat, got ${(a.trend * 100).toFixed(0)}%`
  );
});

test('trend still catches a genuine decline', () => {
  const older = [post(28, 50_000), post(24, 50_000), post(20, 50_000)];
  const newer = [post(12, 8_000), post(9, 7_000), post(5, 9_000)];
  const a = analyzePage(page(), [...newer, ...older], [], { now: NOW });
  assert.ok(a.trend < -0.5, `expected a steep decline, got ${a.trend}`);
});

test('reliability compares posting cadence against the agreed quota', () => {
  const posts = Array.from({ length: 10 }, (_, i) => post(i * 3, 5000)); // ~2.3/week
  const a = analyzePage(page({ expected_posts_per_week: 5 }), posts, [], { now: NOW });
  assert.ok(a.reliability > 0.4 && a.reliability < 0.6);
  assert.ok(a.flags.some((f) => f.label === 'Under quota'));
});

test('follower growth is measured from the oldest snapshot inside the window', () => {
  const snapshots = [
    { captured_at: daysAgo(90), follower_count: 1000 }, // outside a 30d window
    { captured_at: daysAgo(28), follower_count: 2000 },
    { captured_at: daysAgo(1), follower_count: 2200 },
  ];
  const a = analyzePage(page(), [post(5, 1000)], snapshots, { windowDays: 30, now: NOW });
  assert.equal(a.followers, 2200);
  assert.equal(a.followerDelta, 200);
  assert.ok(Math.abs(a.followerGrowthPct - 0.1) < 1e-9);
});

test('high views with near-zero engagement is flagged as suspicious', () => {
  const posts = [post(10, 400_000, 0.008), post(4, 300_000, 0.008)];
  const a = analyzePage(page(), posts, [], { now: NOW });
  assert.ok(a.flags.some((f) => f.label === 'Engagement looks off'));
});

test('a silent page is flagged, an active one is not', () => {
  const silent = analyzePage(page(), [post(40, 9000)], [], { now: NOW });
  assert.ok(silent.flags.some((f) => f.label === 'No posts in window'));

  const active = analyzePage(
    page(),
    Array.from({ length: 20 }, (_, i) => post(i + 1, 9000)),
    [],
    { now: NOW }
  );
  assert.ok(!active.flags.some((f) => f.level === 'error'));
});

test('never-synced pages say so', () => {
  const flags = flagsFor(
    { ...analyzePage(page({ last_sync_at: null }), [post(2, 100)], [], { now: NOW }) },
    { now: NOW }
  );
  assert.ok(flags.some((f) => f.label === 'Never synced'));
});

test('percentile ranks put the best page on top', () => {
  const analyses = [
    { pageId: 'a', score: 10 },
    { pageId: 'b', score: 50 },
    { pageId: 'c', score: 90 },
  ];
  const ranks = percentileRanks(analyses, 'score');
  assert.ok(ranks.c > ranks.b && ranks.b > ranks.a);
});

test('roster summary aggregates and ranks the pages', () => {
  const build = (handle, views, score) => ({
    pageId: handle,
    handle,
    status: 'active',
    totalViews: views,
    totalEngagements: views * 0.1,
    totalPosts: 5,
    posts: 5,
    followers: 1000,
    followerDelta: 10,
    score,
    flags: [],
  });
  const summary = summarizeRoster([build('a', 100, 30), build('b', 900, 80)]);
  assert.equal(summary.totalViews, 1000);
  assert.equal(summary.pages, 2);
  assert.equal(summary.topPerformers[0].handle, 'b');
  assert.ok(Math.abs(summary.avgEngagementRate - 0.1) < 1e-9);
});
