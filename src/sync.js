#!/usr/bin/env node
/**
 * sync.js — Chartex → Airtable sync runner
 *
 * Usage:
 *   node src/sync.js              # live run against Chartex API
 *   node src/sync.js --dry-run    # print data, skip Airtable writes
 *   node src/sync.js --demo       # inject mock data (no Chartex key needed)
 *
 * Required env vars (live mode):
 *   CHARTEX_API_KEY    — your Chartex API key
 *   CHARTEX_ARTIST_ID  — Ebril's artist ID on Chartex
 *   AIRTABLE_API_KEY   — Airtable personal access token
 *   AIRTABLE_BASE_ID   — defaults to applXEAjh6k3Xmybl
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const ChartexClient = require('./chartex-client');
const { syncToAirtable } = require('./airtable-sync');

const isDryRun = process.argv.includes('--dry-run');
const isDemo   = process.argv.includes('--demo');

// ── Demo / mock data (for local testing without API keys) ────────────────────

const MOCK_SNAPSHOTS = [
  {
    track: { id: 'trk_001', title: 'Different', isrc: 'USEBN2400001', releaseDate: '2024-03-01' },
    usage: {
      tiktok:     { soundUses: 48200, weeklyVelocity: 3400, trend: 'rising' },
      spotify:    { streams: 1820000, monthlyVelocity: 62000, trend: 'rising' },
      youtube:    { views: 540000, weeklyVelocity: 9800, trend: 'stable' },
      shazam:     { searches: 24100, trend: 'rising' },
      appleMusic: { plays: 390000, trend: 'rising' },
      lastUpdated: new Date().toISOString(),
    },
    creators: [
      {
        creatorId: 'c001', username: 'kaylacreates', platform: 'tiktok',
        followers: 284000, avgViews: 62000, postCount: 7,
        firstUsed: '2024-11-12', latestPost: '2024-12-01',
        country: 'US', influenceScore: 82,
      },
      {
        creatorId: 'c002', username: 'vibeswithval', platform: 'tiktok',
        followers: 91000, avgViews: 18400, postCount: 3,
        firstUsed: '2024-11-18', latestPost: '2024-11-29',
        country: 'UK', influenceScore: 61,
      },
      {
        creatorId: 'c003', username: 'moodboardmia', platform: 'instagram',
        followers: 47000, avgViews: 9200, postCount: 2,
        firstUsed: '2024-11-22', latestPost: '2024-11-30',
        country: 'CA', influenceScore: 44,
      },
    ],
  },
  {
    track: { id: 'trk_002', title: 'On My Own', isrc: 'USEBN2400002', releaseDate: '2024-06-15' },
    usage: {
      tiktok:     { soundUses: 12700, weeklyVelocity: 890, trend: 'stable' },
      spotify:    { streams: 640000, monthlyVelocity: 21000, trend: 'stable' },
      youtube:    { views: 180000, weeklyVelocity: 3100, trend: 'stable' },
      shazam:     { searches: 8600, trend: 'stable' },
      appleMusic: { plays: 112000, trend: 'stable' },
      lastUpdated: new Date().toISOString(),
    },
    creators: [
      {
        creatorId: 'c004', username: 'sunsetfilms_', platform: 'youtube',
        followers: 125000, avgViews: 34000, postCount: 1,
        firstUsed: '2024-09-02', latestPost: '2024-11-14',
        country: 'US', influenceScore: 71,
      },
    ],
  },
  {
    track: { id: 'trk_003', title: 'Nonstop', isrc: 'USEBN2400003', releaseDate: '2024-09-01' },
    usage: {
      tiktok:     { soundUses: 7300, weeklyVelocity: 1200, trend: 'rising' },
      spotify:    { streams: 310000, monthlyVelocity: 18400, trend: 'rising' },
      youtube:    { views: 94000, weeklyVelocity: 2700, trend: 'rising' },
      shazam:     { searches: 5100, trend: 'rising' },
      appleMusic: { plays: 76000, trend: 'rising' },
      lastUpdated: new Date().toISOString(),
    },
    creators: [
      {
        creatorId: 'c005', username: 'daycreator', platform: 'tiktok',
        followers: 18000, avgViews: 4100, postCount: 4,
        firstUsed: '2024-11-05', latestPost: '2024-11-28',
        country: 'US', influenceScore: 38,
      },
      {
        creatorId: 'c006', username: 'lyricsmixx', platform: 'tiktok',
        followers: 61000, avgViews: 11300, postCount: 2,
        firstUsed: '2024-11-10', latestPost: '2024-11-25',
        country: 'NG', influenceScore: 55,
      },
    ],
  },
];

const MOCK_RISING_SOUNDS = [
  {
    trackId: 'ext_001', title: 'Slow Down', artistName: 'VVAVES',
    label: 'Independent', isIndependent: true,
    velocityScore: 88, weeklyGrowthPct: 142,
    platforms: ['TikTok', 'Spotify', 'YouTube'],
    topCreator: '@dancewithkira',
  },
  {
    trackId: 'ext_002', title: 'Midnight Drive', artistName: 'Lourds',
    label: 'AWAL', isIndependent: true,
    velocityScore: 74, weeklyGrowthPct: 91,
    platforms: ['TikTok', 'Spotify'],
    topCreator: '@aestheticmoods',
  },
  {
    trackId: 'ext_003', title: 'Alright Now', artistName: 'J. Waves',
    label: 'Independent', isIndependent: true,
    velocityScore: 63, weeklyGrowthPct: 58,
    platforms: ['TikTok', 'YouTube', 'Shazam'],
    topCreator: '@urbanstyle.tv',
  },
];

const MOCK_RISING_CREATORS = [
  {
    creatorId: 'rc_001', username: 'dariomovements', platform: 'tiktok',
    followers: 74000, weeklyFollowerGrowth: 6200,
    avgEngagementRate: 8.4, topSound: 'Different – Ebril',
    country: 'US', genre: 'R&B/Soul',
  },
  {
    creatorId: 'rc_002', username: 'nycfilmdiary', platform: 'instagram',
    followers: 31000, weeklyFollowerGrowth: 2900,
    avgEngagementRate: 6.1, topSound: 'On My Own – Ebril',
    country: 'US', genre: 'Lifestyle/Aesthetic',
  },
  {
    creatorId: 'rc_003', username: 'afrobeats_uk', platform: 'tiktok',
    followers: 108000, weeklyFollowerGrowth: 8700,
    avgEngagementRate: 9.2, topSound: 'Slow Down – VVAVES',
    country: 'UK', genre: 'Afrobeats',
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Chartex → Airtable Sync ===');
  console.log(`Mode: ${isDemo ? 'DEMO' : isDryRun ? 'DRY-RUN' : 'LIVE'}\n`);

  let snapshots, risingSounds, risingCreators;

  if (isDemo) {
    console.log('Using mock data…');
    snapshots     = MOCK_SNAPSHOTS;
    risingSounds  = MOCK_RISING_SOUNDS;
    risingCreators = MOCK_RISING_CREATORS;
  } else {
    // Live Chartex fetch
    const apiKey   = process.env.CHARTEX_API_KEY;
    const artistId = process.env.CHARTEX_ARTIST_ID;

    if (!apiKey || !artistId) {
      console.error('Error: CHARTEX_API_KEY and CHARTEX_ARTIST_ID must be set in .env');
      process.exit(1);
    }

    const chartex = new ChartexClient(apiKey);
    console.log(`Fetching Ebril snapshot (artist: ${artistId})…`);

    [snapshots, risingSounds, risingCreators] = await Promise.all([
      chartex.getEbrilSnapshot(artistId),
      chartex.getRisingSounds({ excludeMajorLabels: true }),
      chartex.getRisingCreators({ limit: 20 }),
    ]);
  }

  console.log(`Tracks: ${snapshots.length}`);
  console.log(`Rising sounds: ${risingSounds.length}`);
  console.log(`Rising creators: ${risingCreators.length}\n`);

  if (isDryRun) {
    console.log('-- DRY RUN: Chartex data preview --\n');
    snapshots.forEach(({ track, usage, creators }) => {
      console.log(`Track: "${track.title}"`);
      console.log(`  TikTok uses: ${(usage.tiktok?.soundUses || 0).toLocaleString()} (+${usage.tiktok?.weeklyVelocity}/wk)`);
      console.log(`  Spotify streams: ${(usage.spotify?.streams || 0).toLocaleString()}`);
      console.log(`  Top creators: ${creators.map((c) => c.username).join(', ')}`);
    });
    console.log('\nRising sounds:', risingSounds.map((s) => `"${s.title}" by ${s.artistName} (vel: ${s.velocityScore})`).join(', '));
    console.log('Rising creators:', risingCreators.map((c) => `@${c.username}`).join(', '));
    console.log('\n[Dry run complete — no Airtable records written]');
    return;
  }

  if (!process.env.AIRTABLE_API_KEY) {
    console.error('Error: AIRTABLE_API_KEY must be set in .env');
    process.exit(1);
  }

  const result = await syncToAirtable(snapshots, risingSounds, risingCreators);

  console.log('\n=== Sync Summary ===');
  console.log(`Campaign record:      ${result.campaign}`);
  console.log(`Creators synced:      ${result.creatorsSynced}`);
  console.log(`Usage moments:        ${result.usageMoments}`);
  console.log(`Rising sound alerts:  ${result.risingSoundAlerts}`);
  console.log(`Rising creators:      ${result.risingCreatorsSynced}`);
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
