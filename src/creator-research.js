#!/usr/bin/env node
/**
 * creator-research.js
 * Discovers, scores, and auto-adds high-value TikTok creators to the Florra CRM.
 *
 * Research sources:
 *   1. Creators using Ebril's own tracks (via Chartex)
 *   2. Creators driving rising sounds in Ebril's genre (via Chartex trending feed)
 *
 * Scoring (0–100):
 *   Followers tier    — nano/micro score highest (best for organic seeding)
 *   Post count        — repeat users are fans, not one-offs
 *   Sound trend       — rising > stable > declining
 *   Platform          — TikTok > Instagram > YouTube
 *   Influence bonus   — Chartex influenceScore as a +0–10 bonus
 *
 * Usage:
 *   node src/creator-research.js                    # live (Chartex + Airtable)
 *   node src/creator-research.js --dry-run          # score & print, no writes
 *   node src/creator-research.js --demo             # mock data, no API keys needed
 *   node src/creator-research.js --threshold=70     # override min score (default 60)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https          = require('https');
const ChartexClient  = require('./chartex-client');

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'applXEAjh6k3Xmybl';
const AT_KEY  = process.env.AIRTABLE_API_KEY;
const AT_BASE = 'https://api.airtable.com/v0';

const isDryRun   = process.argv.includes('--dry-run');
const isDemo     = process.argv.includes('--demo');
const thresholdArg = process.argv.find((a) => a.startsWith('--threshold='));
const THRESHOLD  = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : 60;

// ── Airtable field IDs ────────────────────────────────────────────────────────

const TABLES = {
  people: 'tblvkCqhZRjOjFYlT',
};

const FIELDS = {
  fullName:           'fldwro19IuxtVwpS2',
  personType:         'fldM7iMLjDnowwgNk',
  strategicRole:      'fldiyMBnszCdQC5ru',
  instagram:          'fldHwcL82xXmMQGAX',
  tikTok:             'fldhsnf6ulLtiFwey',
  youtube:            'fldcAKIGRWYTGGqZI',
  location:           'fldBn0L8ZAIIfKnhx',
  source:             'flda9AxkdQuhRrwqQ',
  relationshipStatus: 'fldtavYCCwyAaKKEn',
  relationshipTier:   'fld69WJYp8F0yxhEF',
  relationshipStrength:'fld0o76wNr2wMmWVd',
  priority:           'fld6LApdoMiQYB2Ul',
  influenceScore:     'fldKSmlOzXOReV5k3',
  notes:              'flddBqyTNVz2RfEVW',
};

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TRACK_CREATORS = [
  // Creators found on Ebril's own tracks (not yet in CRM)
  {
    creatorId: 'ext_c01', username: 'morningpetals_', platform: 'tiktok',
    followers: 38000, avgViews: 9400, postCount: 5,
    firstUsed: '2025-01-10', latestPost: '2025-02-14',
    country: 'US', influenceScore: 67,
    soundTitle: 'Different', soundTrend: 'rising', soundWeeklyVelocity: 4200,
  },
  {
    creatorId: 'ext_c02', username: 'softnightss', platform: 'tiktok',
    followers: 91000, avgViews: 22000, postCount: 3,
    firstUsed: '2025-01-22', latestPost: '2025-02-18',
    country: 'UK', influenceScore: 74,
    soundTitle: 'Different', soundTrend: 'rising', soundWeeklyVelocity: 4200,
  },
  {
    creatorId: 'ext_c03', username: 'readingbyrain', platform: 'instagram',
    followers: 14000, avgViews: 3800, postCount: 2,
    firstUsed: '2025-02-01', latestPost: '2025-02-20',
    country: 'CA', influenceScore: 42,
    soundTitle: 'On My Own', soundTrend: 'stable', soundWeeklyVelocity: 890,
  },
  {
    creatorId: 'ext_c04', username: 'herbsandfilm', platform: 'tiktok',
    followers: 7200, avgViews: 2100, postCount: 4,
    firstUsed: '2025-01-30', latestPost: '2025-02-22',
    country: 'US', influenceScore: 38,
    soundTitle: 'Nonstop', soundTrend: 'rising', soundWeeklyVelocity: 1200,
  },
];

const MOCK_RISING_SOUND_CREATORS = [
  // Creators driving rising sounds in Ebril's genre (potential targets)
  {
    creatorId: 'ext_c05', username: 'slowsundayvibe', platform: 'tiktok',
    followers: 52000, avgViews: 14000, postCount: 6,
    firstUsed: '2025-01-15', latestPost: '2025-02-25',
    country: 'US', influenceScore: 71,
    soundTitle: 'Slow Down', artistName: 'VVAVES', soundTrend: 'rising', soundWeeklyVelocity: 8800,
  },
  {
    creatorId: 'ext_c06', username: 'midnightdriveclips', platform: 'tiktok',
    followers: 23000, avgViews: 6700, postCount: 8,
    firstUsed: '2025-02-03', latestPost: '2025-02-26',
    country: 'US', influenceScore: 55,
    soundTitle: 'Midnight Drive', artistName: 'Lourds', soundTrend: 'rising', soundWeeklyVelocity: 3100,
  },
  {
    creatorId: 'ext_c07', username: 'botanicaldiary', platform: 'instagram',
    followers: 61000, avgViews: 11000, postCount: 2,
    firstUsed: '2025-02-10', latestPost: '2025-02-24',
    country: 'UK', influenceScore: 63,
    soundTitle: 'Midnight Drive', artistName: 'Lourds', soundTrend: 'rising', soundWeeklyVelocity: 3100,
  },
  {
    creatorId: 'ext_c08', username: 'linenlightt', platform: 'tiktok',
    followers: 9100, avgViews: 2800, postCount: 3,
    firstUsed: '2025-02-08', latestPost: '2025-02-27',
    country: 'US', influenceScore: 44,
    soundTitle: 'Alright Now', artistName: 'J. Waves', soundTrend: 'stable', soundWeeklyVelocity: 1100,
  },
  {
    creatorId: 'ext_c09', username: 'ghiblidreaming', platform: 'tiktok',
    followers: 175000, avgViews: 41000, postCount: 2,
    firstUsed: '2025-02-05', latestPost: '2025-02-23',
    country: 'US', influenceScore: 80,
    soundTitle: 'Slow Down', artistName: 'VVAVES', soundTrend: 'rising', soundWeeklyVelocity: 8800,
  },
];

// ── Scoring algorithm ────────────────────────────────────────────────────────

/**
 * Score a creator 0–100 based on how valuable they are for Ebril's UGC strategy.
 *
 * Weights:
 *   35 pts — Followers tier  (nano/micro are best: reachable, affordable, authentic)
 *   30 pts — Post count      (repeat usage = genuine fan, not a one-off)
 *   25 pts — Sound trend     (rising sounds = momentum, not a dead wave)
 *   10 pts — Platform match  (TikTok preferred for sound seeding)
 *  +10 bonus — Chartex influenceScore if available
 */
function scoreCreator(creator) {
  let score = 0;
  const reasons = [];

  // 1. Followers tier (35 pts max)
  const f = creator.followers || 0;
  if      (f >= 5000   && f < 20000)  { score += 35; reasons.push(`nano ${f.toLocaleString()} flw (+35)`); }
  else if (f >= 20000  && f < 100000) { score += 32; reasons.push(`micro ${f.toLocaleString()} flw (+32)`); }
  else if (f >= 100000 && f < 500000) { score += 22; reasons.push(`mid-tier ${f.toLocaleString()} flw (+22)`); }
  else if (f >= 500000)               { score += 10; reasons.push(`macro ${f.toLocaleString()} flw (+10)`); }
  else                                { score +=  5; reasons.push(`very small ${f.toLocaleString()} flw (+5)`); }

  // 2. Post count with the sound (30 pts max)
  const p = creator.postCount || 1;
  if      (p >= 5) { score += 30; reasons.push(`${p} posts with sound (+30)`); }
  else if (p >= 3) { score += 20; reasons.push(`${p} posts with sound (+20)`); }
  else if (p >= 2) { score += 14; reasons.push(`${p} posts with sound (+14)`); }
  else             { score +=  8; reasons.push(`${p} post with sound (+8)`); }

  // 3. Sound trend (25 pts max)
  const trend = (creator.soundTrend || 'stable').toLowerCase();
  if      (trend === 'rising')   { score += 25; reasons.push('sound rising (+25)'); }
  else if (trend === 'stable')   { score += 15; reasons.push('sound stable (+15)'); }
  else                           { score +=  5; reasons.push('sound declining (+5)'); }

  // 4. Platform (10 pts max)
  const platform = (creator.platform || '').toLowerCase();
  if      (platform === 'tiktok')    { score += 10; reasons.push('TikTok (+10)'); }
  else if (platform === 'instagram') { score +=  7; reasons.push('Instagram (+7)'); }
  else if (platform === 'youtube')   { score +=  5; reasons.push('YouTube (+5)'); }

  // 5. Influence bonus (up to +10)
  if (creator.influenceScore) {
    const bonus = Math.round(creator.influenceScore / 10);
    score += bonus;
    reasons.push(`Chartex influence ${creator.influenceScore} (+${bonus})`);
  }

  return { score: Math.min(score, 100), reasons };
}

function priority(score) {
  if (score >= 75) return 'High';
  if (score >= 55) return 'Medium';
  return 'Low';
}

function strategicRole(followers) {
  if (followers >= 100000) return 'Influencer';
  if (followers >= 10000)  return 'Micro-Influencer';
  return 'Content Creator';
}

// ── Airtable helpers ─────────────────────────────────────────────────────────

function atRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url     = `${AT_BASE}/${BASE_ID}/${path}`;
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
        if (res.statusCode >= 400) return reject(new Error(`Airtable ${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data}`)); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** Fetch all existing People records and return a Set of known handles. */
async function fetchExistingHandles() {
  const handles = new Set();
  let offset = null;

  do {
    const qs = new URLSearchParams({
      fields: [FIELDS.tikTok, FIELDS.instagram, FIELDS.youtube],
      ...(offset ? { offset } : {}),
    });
    const res = await atRequest('GET', `${TABLES.people}?${qs}`);
    for (const rec of res.records || []) {
      const f = rec.fields || {};
      [f[FIELDS.tikTok], f[FIELDS.instagram], f[FIELDS.youtube]]
        .filter(Boolean)
        .forEach((h) => handles.add(h.replace(/^@/, '').toLowerCase()));
    }
    offset = res.offset || null;
  } while (offset);

  return handles;
}

/** Look up the UGC Pipeline table ID by name. */
async function findUGCPipelineTableId() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${AT_KEY}` },
  }).catch(() => null);

  if (!res || !res.ok) {
    // Fallback: use https module
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.airtable.com',
        path: `/v0/meta/bases/${BASE_ID}/tables`,
        method: 'GET',
        headers: { Authorization: `Bearer ${AT_KEY}` },
      };
      const req = https.request(options, (r) => {
        let data = '';
        r.on('data', (c) => (data += c));
        r.on('end', () => {
          try {
            const { tables } = JSON.parse(data);
            const t = (tables || []).find((x) => x.name === 'UGC Pipeline');
            resolve(t ? t.id : null);
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.end();
    });
  }

  const { tables } = await res.json();
  const t = (tables || []).find((x) => x.name === 'UGC Pipeline');
  return t ? t.id : null;
}

function createRecords(tableId, records) {
  const chunks = [];
  for (let i = 0; i < records.length; i += 10) chunks.push(records.slice(i, i + 10));
  return Promise.all(chunks.map((c) => atRequest('POST', tableId, { records: c })));
}

// ── Map creators to Airtable records ────────────────────────────────────────

function buildPeopleRecord(creator, scored) {
  const platform = (creator.platform || '').toLowerCase();
  const soundCtx = creator.soundTitle
    ? `Sound: "${creator.soundTitle}"${creator.artistName ? ` by ${creator.artistName}` : ' (Ebril track)'}`
    : '';

  return {
    fields: {
      [FIELDS.fullName]:            creator.username,
      [FIELDS.personType]:          'Creator',
      [FIELDS.strategicRole]:       strategicRole(creator.followers),
      ...(platform === 'tiktok'    ? { [FIELDS.tikTok]:    `@${creator.username}` } : {}),
      ...(platform === 'instagram' ? { [FIELDS.instagram]: `@${creator.username}` } : {}),
      ...(platform === 'youtube'   ? { [FIELDS.youtube]:   creator.username }       : {}),
      ...(creator.country          ? { [FIELDS.location]:  creator.country }        : {}),
      [FIELDS.source]:              platform === 'tiktok'    ? 'TikTok'    :
                                    platform === 'instagram' ? 'Instagram' : 'YouTube',
      [FIELDS.relationshipStatus]:  'New',
      [FIELDS.relationshipTier]:    'Prospect',
      [FIELDS.relationshipStrength]:'New',
      [FIELDS.priority]:            priority(scored.score),
      [FIELDS.influenceScore]:      scored.score,
      [FIELDS.notes]:
        `Auto-discovered by creator-research.js\n` +
        `Research score: ${scored.score}/100 — ${scored.reasons.join(', ')}\n\n` +
        `${soundCtx}\n` +
        `Posts with sound: ${creator.postCount || '?'} | ` +
        `Followers: ${(creator.followers || 0).toLocaleString()} | ` +
        `Avg views: ${(creator.avgViews || 0).toLocaleString()}\n` +
        `First used: ${creator.firstUsed || '?'} | Latest post: ${creator.latestPost || '?'}\n` +
        `Chartex influenceScore: ${creator.influenceScore || '?'}`,
    },
  };
}

function buildUGCPipelineRecord(creator, scored, peopleId, pipelineTableId) {
  const isSoundDriver = !!creator.artistName; // driving someone else's rising sound vs Ebril's own
  const context = isSoundDriver
    ? `Drives "${creator.soundTitle}" by ${creator.artistName} — similar audience to Ebril's`
    : `Uses Ebril's track "${creator.soundTitle}" — ${creator.postCount} post(s)`;

  return {
    fields: {
      'Creator Handle':  `@${creator.username}`,
      'UGC Stage':       'Identified',
      'Format':          'Custom',
      'Track Assigned':  creator.soundTitle || '',
      'Priority Score':  scored.score,
      'Notes':
        `Auto-discovered | Score: ${scored.score}/100\n` +
        context + '\n' +
        `Sound trend: ${creator.soundTrend || '?'} | Weekly velocity: ${creator.soundWeeklyVelocity || '?'}\n` +
        `Followers: ${(creator.followers || 0).toLocaleString()} | Avg views: ${(creator.avgViews || 0).toLocaleString()}`,
      'Creator':  peopleId ? [peopleId] : [],
    },
  };
}

// ── Chartex data fetching ────────────────────────────────────────────────────

async function fetchLiveCreators(artistId) {
  const chartex = new ChartexClient(process.env.CHARTEX_API_KEY);
  const log = (m) => console.log(`[chartex] ${m}`);

  log('Fetching Ebril track list…');
  const { tracks } = await chartex.getArtistTracks(artistId);
  log(`Found ${tracks.length} track(s).`);

  // Creators on Ebril's own tracks
  const trackCreators = [];
  for (const track of tracks) {
    log(`  Fetching creators for "${track.title}"…`);
    const usage   = await chartex.getTrackUsage(track.id);
    const { items } = await chartex.getTrackCreators(track.id, { limit: 20 });
    for (const c of items || []) {
      trackCreators.push({
        ...c,
        soundTitle:         track.title,
        soundTrend:         usage.tiktok?.trend || 'stable',
        soundWeeklyVelocity: usage.tiktok?.weeklyVelocity || 0,
      });
    }
  }

  // Creators driving rising sounds (similar genre)
  log('Fetching rising sounds…');
  const rising = await chartex.getRisingSounds({ excludeMajorLabels: true, limit: 10 });
  const risingCreators = [];
  for (const sound of rising) {
    log(`  Fetching creators for rising sound "${sound.title}"…`);
    try {
      const { items } = await chartex.getTrackCreators(sound.trackId, { limit: 10 });
      for (const c of items || []) {
        risingCreators.push({
          ...c,
          soundTitle:         sound.title,
          artistName:         sound.artistName,
          soundTrend:         'rising',
          soundWeeklyVelocity: Math.round((sound.weeklyGrowthPct || 0) * 10),
        });
      }
    } catch { /* skip if track not available */ }
  }

  return { trackCreators, risingCreators };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Creator Research Engine ===');
  console.log(`Mode: ${isDemo ? 'DEMO' : isDryRun ? 'DRY-RUN' : 'LIVE'} | Threshold: ${THRESHOLD}/100\n`);

  // 1. Get creators to evaluate
  let trackCreators, risingCreators;

  if (isDemo) {
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
    ({ trackCreators, risingCreators } = await fetchLiveCreators(artistId));
  }

  const allCreators = [
    ...trackCreators.map((c) => ({ ...c, sourceType: 'ebril-track' })),
    ...risingCreators.map((c) => ({ ...c, sourceType: 'rising-sound' })),
  ];

  console.log(`Evaluating ${allCreators.length} creator(s)…\n`);

  // 2. Score all creators
  const scored = allCreators.map((c) => ({ creator: c, ...scoreCreator(c) }));

  // 3. Filter by threshold
  const qualified = scored.filter((s) => s.score >= THRESHOLD);
  const rejected  = scored.filter((s) => s.score < THRESHOLD);

  console.log(`Qualified (score >= ${THRESHOLD}): ${qualified.length}`);
  console.log(`Below threshold:                  ${rejected.length}\n`);

  // 4. Print full scoring table
  console.log('── Scoring Results ──────────────────────────────────────────────');
  for (const s of [...qualified, ...rejected].sort((a, b) => b.score - a.score)) {
    const tag = s.score >= THRESHOLD ? '✓' : '✗';
    console.log(`${tag} ${String(s.score).padStart(3)}/100  @${s.creator.username.padEnd(22)} [${s.creator.platform}] — ${s.creator.soundTitle}`);
    if (s.score >= THRESHOLD) {
      console.log(`        ${s.reasons.join(' | ')}`);
    }
  }
  console.log('');

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

  // 5. Deduplicate against existing People records
  console.log('Fetching existing CRM handles for deduplication…');
  const existingHandles = await fetchExistingHandles();
  console.log(`  Found ${existingHandles.size} existing handle(s) in CRM.\n`);

  const newCreators = qualified.filter(({ creator }) => {
    const handle = creator.username.toLowerCase();
    return !existingHandles.has(handle);
  });

  const dupes = qualified.length - newCreators.length;
  if (dupes > 0) console.log(`Skipping ${dupes} already in CRM.\n`);
  if (newCreators.length === 0) {
    console.log('All qualified creators already in CRM. Done.');
    return;
  }

  console.log(`Adding ${newCreators.length} new creator(s) to CRM…\n`);

  // 6. Add to People table
  const peopleRecords = newCreators.map(({ creator, score, reasons }) =>
    buildPeopleRecord(creator, { score, reasons })
  );
  const peopleResults = await createRecords(TABLES.people, peopleRecords);
  const addedPeople   = peopleResults.flatMap((r) => r.records);
  console.log(`✓ Added ${addedPeople.length} People record(s).`);

  // 7. Add to UGC Pipeline table (if it exists)
  const pipelineTableId = await findUGCPipelineTableId();

  if (!pipelineTableId) {
    console.log('ℹ  UGC Pipeline table not found — run `npm run setup:ugc` first to enable auto-pipeline.');
  } else {
    const pipelineRecords = newCreators.map(({ creator, score, reasons }, i) =>
      buildUGCPipelineRecord(creator, { score, reasons }, addedPeople[i]?.id, pipelineTableId)
    );
    const pipelineResults = await createRecords(pipelineTableId, pipelineRecords);
    const addedPipeline   = pipelineResults.flatMap((r) => r.records);
    console.log(`✓ Added ${addedPipeline.length} UGC Pipeline record(s) at stage "Identified".`);
  }

  // 8. Summary
  console.log('\n=== Research Summary ===');
  console.log(`Creators evaluated:   ${allCreators.length}`);
  console.log(`Qualified (>=${THRESHOLD}):     ${qualified.length}`);
  console.log(`Already in CRM:       ${dupes}`);
  console.log(`Net new added:        ${newCreators.length}`);
  console.log('\nTop additions:');
  newCreators.slice(0, 5).forEach(({ creator, score }) => {
    console.log(`  ${score}/100  @${creator.username} [${creator.platform}] — ${creator.soundTitle}`);
  });
}

main().catch((err) => {
  console.error('Research failed:', err.message);
  process.exit(1);
});
