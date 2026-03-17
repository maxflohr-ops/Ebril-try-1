#!/usr/bin/env node
/**
 * creator-research.js
 * Discovers, scores, and auto-adds high-value creators to the Florra CRM.
 *
 * Research sources:
 *   1. Creators using Ebril's own tracks  (Chartex getTrackCreators)
 *   2. Creators driving rising sounds in genre  (Chartex getRisingSounds → getTrackCreators)
 *
 * Scoring (0–100):
 *   Followers tier    35 pts  nano/micro score highest — reachable, authentic, affordable
 *   Post count        30 pts  repeat posters are genuine fans
 *   Sound trend       25 pts  rising > stable > declining
 *   Platform          10 pts  TikTok > Instagram > YouTube
 *   Influence bonus  +10 pts  Chartex influenceScore / 10
 *
 * Usage:
 *   node src/creator-research.js                          # live run (Ebril's tracks + rising sounds)
 *   node src/creator-research.js --sound-url <url>        # any TikTok URL or short link
 *   node src/creator-research.js --dry-run                # score & print, no writes
 *   node src/creator-research.js --demo                   # mock data, no API keys needed
 *   node src/creator-research.js --threshold=75           # override min score (default 60)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https         = require('https');
const ChartexClient = require('./chartex-client');
const { TABLES, FIELDS } = require('./airtable-sync');
const { queueProfileVisit, queueStats, loadQueue } = require('./cobalt-client');
const { lookupSoundCreators } = require('./sound-lookup');

const BASE_ID  = process.env.AIRTABLE_BASE_ID || 'applXEAjh6k3Xmybl';
const AT_KEY   = process.env.AIRTABLE_API_KEY;

const isDryRun     = process.argv.includes('--dry-run');
const isDemo       = process.argv.includes('--demo');
const thresholdArg = process.argv.find((a) => a.startsWith('--threshold='));
const THRESHOLD    = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : 60;

// --sound-url <url>  — drop any TikTok URL/short link to find creators using that sound
const soundUrlIdx = process.argv.indexOf('--sound-url');
const SOUND_URL   = soundUrlIdx !== -1 ? process.argv[soundUrlIdx + 1] : null;

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpRequest(method, url, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        Authorization:  `Bearer ${AT_KEY}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data}`)); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const atData = (method, path, body) =>
  httpRequest(method, `https://api.airtable.com/v0/${BASE_ID}/${path}`, body);

const atMeta = (method, path, body) =>
  httpRequest(method, `https://api.airtable.com/v0/meta${path}`, body);

/** Build a fields[]-safe query string (URLSearchParams drops repeated keys). */
function buildListUrl(tableId, fieldIds, offset) {
  const parts = fieldIds.map((id) => `fields%5B%5D=${encodeURIComponent(id)}`);
  parts.push('pageSize=100');
  if (offset) parts.push(`offset=${encodeURIComponent(offset)}`);
  return `${tableId}?${parts.join('&')}`;
}

function createRecords(tableId, records) {
  const chunks = [];
  for (let i = 0; i < records.length; i += 10) chunks.push(records.slice(i, i + 10));
  return Promise.all(chunks.map((c) => atData('POST', tableId, { records: c })));
}

// ── Concurrency limiter (for Chartex bulk fetches) ────────────────────────────

async function mapWithConcurrency(items, fn, limit = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = await Promise.all(items.slice(i, i + limit).map(fn));
    results.push(...batch);
  }
  return results;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function normalizeHandle(h) {
  return (h || '').toLowerCase().replace(/^@/, '').trim();
}

/** Fetch all TikTok/IG/YouTube handles already in the People table. */
async function fetchExistingHandles() {
  const handles = new Set();
  let offset    = null;

  do {
    const url = buildListUrl(
      TABLES.people,
      [FIELDS.tikTok, FIELDS.instagram, FIELDS.youtube],
      offset,
    );
    const res = await atData('GET', url);
    for (const rec of res.records || []) {
      const f = rec.fields || {};
      [f[FIELDS.tikTok], f[FIELDS.instagram], f[FIELDS.youtube]]
        .filter(Boolean)
        .forEach((h) => handles.add(normalizeHandle(h)));
    }
    offset = res.offset || null;
  } while (offset);

  return handles;
}

// ── UGC Pipeline table discovery ──────────────────────────────────────────────

/** Look up the UGC Pipeline table and return its field map (name → id). */
async function discoverUGCPipeline() {
  const { tables } = await atMeta('GET', `/bases/${BASE_ID}/tables`);
  const t = (tables || []).find((x) => x.name === 'UGC Pipeline');
  if (!t) {
    console.warn(
      'ℹ  UGC Pipeline table not found — run `npm run setup:ugc` to enable auto-pipeline.',
    );
    return null;
  }
  const fieldMap = {};
  for (const f of t.fields) fieldMap[f.name] = f.id;
  return { tableId: t.id, fieldMap };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Score a creator 0–100.
 *   35 pts — Followers tier
 *   30 pts — Post count (repeat usage = genuine fan)
 *   25 pts — Sound trend
 *   10 pts — Platform
 *  +10 pts — Chartex influence bonus
 */
function scoreCreator(creator) {
  let score = 0;
  const reasons = [];

  // 1. Followers tier (35 pts)
  const f = creator.followers || 0;
  if      (f >= 500_000)               { score += 10; reasons.push(`macro ${f.toLocaleString()} (+10)`); }
  else if (f >= 100_000)               { score += 25; reasons.push(`mid-tier ${f.toLocaleString()} (+25)`); }
  else if (f >= 20_000)                { score += 35; reasons.push(`micro ${f.toLocaleString()} (+35)`); }
  else if (f >= 5_000)                 { score += 30; reasons.push(`nano ${f.toLocaleString()} (+30)`); }
  else                                 { score +=  5; reasons.push(`very small ${f.toLocaleString()} (+5)`); }

  // 2. Post count (30 pts)
  const p = creator.postCount || 1;
  if      (p >= 5) { score += 30; reasons.push(`${p} posts (+30)`); }
  else if (p >= 3) { score += 20; reasons.push(`${p} posts (+20)`); }
  else if (p >= 2) { score += 14; reasons.push(`${p} posts (+14)`); }
  else             { score +=  8; reasons.push(`1 post (+8)`); }

  // 3. Sound trend (25 pts)
  const trend = (creator.soundTrend || 'stable').toLowerCase();
  if      (trend === 'rising')   { score += 25; reasons.push('rising (+25)'); }
  else if (trend === 'stable')   { score += 15; reasons.push('stable (+15)'); }
  else                           { score +=  5; reasons.push('declining (+5)'); }

  // 4. Platform (10 pts)
  const platform = (creator.platform || '').toLowerCase();
  if      (platform === 'tiktok')    { score += 10; reasons.push('TikTok (+10)'); }
  else if (platform === 'instagram') { score +=  7; reasons.push('Instagram (+7)'); }
  else if (platform === 'youtube')   { score +=  5; reasons.push('YouTube (+5)'); }

  // 5. Influence bonus (+10)
  if (creator.influenceScore) {
    const bonus = Math.round(creator.influenceScore / 10);
    score += bonus;
    reasons.push(`influence ${creator.influenceScore} (+${bonus})`);
  }

  return { score: Math.min(score, 100), reasons };
}

function toPriority(score) {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}

function toStrategicRole(followers) {
  if (followers >= 100_000) return 'Influencer';
  if (followers >= 20_000)  return 'Micro-Influencer';
  return 'Content Creator';
}

function toSource(platform) {
  if (platform === 'tiktok')    return 'TikTok';
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'youtube')   return 'YouTube';
  return 'Organic';
}

// ── Record builders ───────────────────────────────────────────────────────────

function buildPeopleRecord(creator, scored) {
  const platform = (creator.platform || '').toLowerCase();
  const soundCtx = creator.soundTitle
    ? `Sound: "${creator.soundTitle}"${creator.artistName ? ` by ${creator.artistName}` : ' (Ebril)'}`
    : '';

  return {
    fields: {
      [FIELDS.fullName]:            creator.username,
      [FIELDS.personType]:          'Creator',
      [FIELDS.strategicRole]:       toStrategicRole(creator.followers || 0),
      ...(platform === 'tiktok'    ? { [FIELDS.tikTok]:    `@${creator.username}` } : {}),
      ...(platform === 'instagram' ? { [FIELDS.instagram]: `@${creator.username}` } : {}),
      ...(platform === 'youtube'   ? { [FIELDS.youtube]:   creator.username }       : {}),
      ...(creator.country          ? { [FIELDS.location]:  creator.country }        : {}),
      [FIELDS.source]:              toSource(platform),
      [FIELDS.relationshipStatus]:  'New',
      [FIELDS.relationshipTier]:    'Prospect',
      [FIELDS.relationshipStrength]:'New',
      [FIELDS.priority]:            toPriority(scored.score),
      [FIELDS.influenceScore]:      scored.score,
      [FIELDS.notes]:
        `Auto-discovered by creator-research.js\n` +
        `Research score: ${scored.score}/100 — ${scored.reasons.join(', ')}\n\n` +
        `${soundCtx}\n` +
        `Posts with sound: ${creator.postCount || '?'} | ` +
        `Followers: ${(creator.followers || 0).toLocaleString()} | ` +
        `Avg views: ${(creator.avgViews || 0).toLocaleString()}\n` +
        `First used: ${creator.firstUsed || '?'} | Latest: ${creator.latestPost || '?'}\n` +
        `Source type: ${creator.sourceType || '?'}`,
    },
  };
}

function buildUGCRecord(creator, scored, peopleId, fieldMap) {
  const isRising   = !!creator.artistName;
  const context    = isRising
    ? `Drives "${creator.soundTitle}" by ${creator.artistName} — similar audience to Ebril`
    : `Uses Ebril's track "${creator.soundTitle}" (${creator.postCount} post(s))`;

  return {
    fields: {
      [fieldMap['Creator Handle']]: `@${creator.username}`,
      [fieldMap['UGC Stage']]:      'Identified',
      [fieldMap['Format']]:         'Custom',
      [fieldMap['Track Assigned']]: creator.soundTitle || '',
      [fieldMap['Priority Score']]: scored.score,
      [fieldMap['Notes']]:
        `Auto-discovered | Score: ${scored.score}/100\n` +
        `${context}\n` +
        `Trend: ${creator.soundTrend || '?'} | Velocity: ${creator.soundWeeklyVelocity || '?'}/wk\n` +
        `Followers: ${(creator.followers || 0).toLocaleString()} | Avg views: ${(creator.avgViews || 0).toLocaleString()}\n` +
        `Reasons: ${scored.reasons.join(', ')}`,
      ...(peopleId ? { [fieldMap['Creator']]: [peopleId] } : {}),
    },
  };
}

// ── Mock data (demo mode) ─────────────────────────────────────────────────────

const MOCK_TRACK_CREATORS = [
  {
    creatorId: 'ext_c01', username: 'morningpetals_', platform: 'tiktok',
    followers: 38000, avgViews: 9400, postCount: 5,
    firstUsed: '2025-01-10', latestPost: '2025-02-14',
    country: 'US', influenceScore: 67,
    soundTitle: 'Different', soundTrend: 'rising', soundWeeklyVelocity: 4200,
    sourceType: 'ebril-track',
  },
  {
    creatorId: 'ext_c02', username: 'softnightss', platform: 'tiktok',
    followers: 91000, avgViews: 22000, postCount: 3,
    firstUsed: '2025-01-22', latestPost: '2025-02-18',
    country: 'UK', influenceScore: 74,
    soundTitle: 'Different', soundTrend: 'rising', soundWeeklyVelocity: 4200,
    sourceType: 'ebril-track',
  },
  {
    creatorId: 'ext_c03', username: 'readingbyrain', platform: 'instagram',
    followers: 14000, avgViews: 3800, postCount: 2,
    firstUsed: '2025-02-01', latestPost: '2025-02-20',
    country: 'CA', influenceScore: 42,
    soundTitle: 'On My Own', soundTrend: 'stable', soundWeeklyVelocity: 890,
    sourceType: 'ebril-track',
  },
  // Already in CRM — dedup demo
  {
    creatorId: 'ext_dup', username: 'kamasaki.jams', platform: 'tiktok',
    followers: 12000, avgViews: 2800, postCount: 3,
    firstUsed: '2025-01-30', latestPost: '2025-02-22',
    country: 'US', influenceScore: 55,
    soundTitle: 'Different', soundTrend: 'rising', soundWeeklyVelocity: 4200,
    sourceType: 'ebril-track',
  },
];

const MOCK_RISING_SOUND_CREATORS = [
  {
    creatorId: 'ext_c05', username: 'slowsundayvibe', platform: 'tiktok',
    followers: 52000, avgViews: 14000, postCount: 6,
    firstUsed: '2025-01-15', latestPost: '2025-02-25',
    country: 'US', influenceScore: 71,
    soundTitle: 'Slow Down', artistName: 'VVAVES',
    soundTrend: 'rising', soundWeeklyVelocity: 8800,
    sourceType: 'rising-sound',
  },
  {
    creatorId: 'ext_c06', username: 'midnightdriveclips', platform: 'tiktok',
    followers: 23000, avgViews: 6700, postCount: 8,
    firstUsed: '2025-02-03', latestPost: '2025-02-26',
    country: 'US', influenceScore: 55,
    soundTitle: 'Midnight Drive', artistName: 'Lourds',
    soundTrend: 'rising', soundWeeklyVelocity: 3100,
    sourceType: 'rising-sound',
  },
  {
    creatorId: 'ext_c07', username: 'botanicaldiary', platform: 'instagram',
    followers: 61000, avgViews: 11000, postCount: 2,
    firstUsed: '2025-02-10', latestPost: '2025-02-24',
    country: 'UK', influenceScore: 63,
    soundTitle: 'Midnight Drive', artistName: 'Lourds',
    soundTrend: 'rising', soundWeeklyVelocity: 3100,
    sourceType: 'rising-sound',
  },
  // Below threshold demo
  {
    creatorId: 'ext_c08', username: 'randomuser999', platform: 'youtube',
    followers: 2000, avgViews: 400, postCount: 1,
    firstUsed: '2025-02-08', latestPost: '2025-02-10',
    country: 'US', influenceScore: 10,
    soundTitle: 'Alright Now', artistName: 'J. Waves',
    soundTrend: 'declining', soundWeeklyVelocity: 200,
    sourceType: 'rising-sound',
  },
];

// ── Live Chartex data collection ──────────────────────────────────────────────

async function collectLiveCreators(artistId) {
  const chartex = new ChartexClient(process.env.CHARTEX_API_KEY);
  const log = (m) => console.log(`  [chartex] ${m}`);

  // Ebril's own tracks
  log('Fetching Ebril track list…');
  const { tracks } = await chartex.getArtistTracks(artistId);
  log(`  ${tracks.length} track(s) found.`);

  const trackCreators = (
    await Promise.all(
      tracks.map(async (track) => {
        const [usage, { items = [] }] = await Promise.all([
          chartex.getTrackUsage(track.id),
          chartex.getTrackCreators(track.id, { limit: 20 }),
        ]);
        return items.map((c) => ({
          ...c,
          soundTitle:          track.title,
          soundTrend:          usage.tiktok?.trend || 'stable',
          soundWeeklyVelocity: usage.tiktok?.weeklyVelocity || 0,
          sourceType:          'ebril-track',
        }));
      }),
    )
  ).flat();

  // Rising sounds in genre
  log('Fetching rising sounds…');
  const risingSounds = await chartex.getRisingSounds({ excludeMajorLabels: true, limit: 15 });
  log(`  ${risingSounds.length} rising sound(s) found.`);

  const risingCreators = (
    await mapWithConcurrency(risingSounds, async (sound) => {
      try {
        const { items = [] } = await chartex.getTrackCreators(sound.trackId, { limit: 10 });
        return items.map((c) => ({
          ...c,
          soundTitle:          sound.title,
          artistName:          sound.artistName,
          soundTrend:          'rising',
          soundWeeklyVelocity: Math.round((sound.weeklyGrowthPct || 0) * 10),
          sourceType:          'rising-sound',
        }));
      } catch {
        log(`  Skipped "${sound.title}" (creators unavailable)`);
        return [];
      }
    }, 5)
  ).flat();

  return { trackCreators, risingCreators };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const modeLabel = SOUND_URL ? 'SOUND URL' : isDemo ? 'DEMO' : isDryRun ? 'DRY-RUN' : 'LIVE';
  console.log('=== Creator Research Engine ===');
  console.log(`Mode: ${modeLabel} | Min score: ${THRESHOLD}/100\n`);

  // 1. Collect creators
  let trackCreators, risingCreators;

  if (SOUND_URL) {
    // ── Sound URL mode ── drop any TikTok URL and find creators from that sound
    const apiKey = process.env.CHARTEX_API_KEY;
    if (!apiKey) {
      console.error('Error: CHARTEX_API_KEY must be set in .env');
      process.exit(1);
    }
    const chartex = new ChartexClient(apiKey);
    console.log('Looking up sound from URL…');
    const { track, creators } = await lookupSoundCreators(SOUND_URL, chartex, { limit: 50 });
    console.log(`  Found ${creators.length} creator(s) using "${track.title}"\n`);
    trackCreators  = creators;
    risingCreators = [];
  } else if (isDemo) {
    console.log('Using mock data…');
    trackCreators  = MOCK_TRACK_CREATORS;
    risingCreators = MOCK_RISING_SOUND_CREATORS;
  } else {
    const apiKey   = process.env.CHARTEX_API_KEY;
    const artistId = process.env.CHARTEX_ARTIST_ID;
    if (!apiKey || !artistId) {
      console.error('Error: CHARTEX_API_KEY and CHARTEX_ARTIST_ID must be set in .env');
      process.exit(1);
    }
    console.log('Fetching from Chartex…');
    ({ trackCreators, risingCreators } = await collectLiveCreators(artistId));
  }

  const allCreators = [...trackCreators, ...risingCreators];
  console.log(`\nEvaluating ${allCreators.length} creator(s)…\n`);

  // 2. Score all creators
  const scored = allCreators.map((c) => ({ creator: c, ...scoreCreator(c) }));

  // 3. Filter by threshold
  const qualified = scored.filter((s) => s.score >= THRESHOLD);
  const rejected  = scored.filter((s) => s.score <  THRESHOLD);

  // 4. Print scoring table
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  console.log('── Scoring Results ──────────────────────────────────────────');
  for (const s of sorted) {
    const tag = s.score >= THRESHOLD ? '✓' : '✗';
    const row = `${tag} ${String(s.score).padStart(3)}/100  @${s.creator.username.padEnd(24)} [${s.creator.platform}]  "${s.creator.soundTitle}"`;
    console.log(row);
    if (s.score >= THRESHOLD) {
      console.log(`        ${s.reasons.join(' | ')}`);
    }
  }
  console.log('');
  console.log(`Qualified (>= ${THRESHOLD}): ${qualified.length}  |  Below threshold: ${rejected.length}\n`);

  if (qualified.length === 0) {
    console.log('No creators met the threshold. Done.');
    return;
  }

  if (isDryRun) {
    console.log('[Dry run — no Airtable writes]');
    return;
  }

  if (!AT_KEY) {
    console.error('Error: AIRTABLE_API_KEY must be set in .env');
    process.exit(1);
  }

  // 5. Deduplicate
  console.log('Checking CRM for existing handles…');
  const existingHandles = await fetchExistingHandles();
  console.log(`  ${existingHandles.size} handle(s) already in CRM.`);

  const newCreators = qualified.filter(
    ({ creator }) => !existingHandles.has(normalizeHandle(creator.username))
  );
  const dupes = qualified.length - newCreators.length;

  if (dupes > 0) console.log(`  Skipping ${dupes} duplicate(s).`);
  console.log(`  Net new: ${newCreators.length}\n`);

  if (newCreators.length === 0) {
    console.log('All qualified creators already in CRM. Done.');
    return;
  }

  // 6. Write to People table
  console.log('Writing to People table…');
  const peopleRecords = newCreators.map(({ creator, score, reasons }) =>
    buildPeopleRecord(creator, { score, reasons })
  );
  const peopleResults = await createRecords(TABLES.people, peopleRecords);
  const addedPeople   = peopleResults.flatMap((r) => r.records);
  console.log(`  ✓ ${addedPeople.length} People record(s) added.`);

  // 7. Write to UGC Pipeline (if the table exists)
  const pipeline = await discoverUGCPipeline();

  if (pipeline) {
    console.log('Writing to UGC Pipeline table…');
    const pipelineRecords = newCreators.map(({ creator, score, reasons }, i) =>
      buildUGCRecord(creator, { score, reasons }, addedPeople[i]?.id, pipeline.fieldMap)
    );
    const pipelineResults = await createRecords(pipeline.tableId, pipelineRecords);
    const addedPipeline   = pipelineResults.flatMap((r) => r.records);
    console.log(`  ✓ ${addedPipeline.length} Pipeline record(s) added at stage "Identified".`);
  }

  // 8. Queue profile visits in Cobalt (no URLs yet — manual review prompts)
  const visitCreators = newCreators.map(({ creator, score }, i) => ({
    ...creator,
    _score:      score,
    _airtableId: addedPeople[i]?.id || null,
  }));
  const visitCount = queueProfileVisit(visitCreators);
  if (visitCount > 0) {
    const qs = queueStats(loadQueue());
    console.log(`\nCobalt visit queue: +${visitCount} profile(s) to review`);
    console.log(`  Total queued: ${qs.pending} pending, ${qs.monitor} to visit`);
    console.log(`  Run "npm run cobalt:audit" to see the full list`);
    console.log(`  When you find a good post: npm run cobalt:add -- --url <url> --creator @handle`);
  }

  // 9. Summary
  console.log('\n=== Research Summary ===');
  console.log(`Evaluated:      ${allCreators.length}`);
  console.log(`Qualified:      ${qualified.length}`);
  console.log(`Dupes skipped:  ${dupes}`);
  console.log(`Added to CRM:   ${newCreators.length}`);
  console.log(`Visit queue:    ${visitCount} new profile(s) to review`);

  if (newCreators.length) {
    console.log('\nTop additions:');
    newCreators
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .forEach(({ creator, score }) =>
        console.log(`  ${score}/100  @${creator.username}  [${creator.platform}]  "${creator.soundTitle}"`)
      );
  }
}

main().catch((err) => {
  console.error('Research failed:', err.message);
  process.exit(1);
});
