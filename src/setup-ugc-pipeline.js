#!/usr/bin/env node
/**
 * setup-ugc-pipeline.js
 * Creates the UGC Pipeline table in Airtable with all fields, views,
 * and populates the 8 initial creator pipeline records.
 *
 * Usage:
 *   node src/setup-ugc-pipeline.js
 *
 * Requires:
 *   AIRTABLE_API_KEY with schema.bases:write scope
 *   AIRTABLE_BASE_ID (defaults to applXEAjh6k3Xmybl)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https = require('https');

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'applXEAjh6k3Xmybl';
const API_KEY = process.env.AIRTABLE_API_KEY;

// Existing table IDs
const PEOPLE_TABLE   = 'tblvkCqhZRjOjFYlT';
const CAMPAIGNS_TABLE = 'tblvbY12bVp1yudmp';
const OUTREACH_TABLE  = 'tbldNGQfKwQEq4yAo';

// Campaign record created in previous sync
const CAMPAIGN_RECORD = 'recSHzRjH3Nvi4O2c';

// ── Creator seed data ─────────────────────────────────────────────────────────

const CREATORS = [
  {
    peopleId:    'recGVfR9gkWMkI421',
    outreachId:  'reczVoZwjvZcUJ8SS',
    handle:      '@donovanbeck',
    stage:       'DM Planned',
    format:      'Poem + Song',
    track:       'Different',
    score:       26,
    dmScript:
      "hey donovan — been following your work for a while. i help with an independent artist " +
      "named Ebril whose music has this same late-night, quiet feeling as your poems. thought " +
      "you might want to hear 'Different' — feels like the kind of track that could sit behind " +
      "your words naturally. no brief, no campaign stuff — genuinely think your audience would " +
      "feel it. happy to send over if you want.",
    notes:
      "SCORE: 26/30 | Emotional:9 Visual:8 Music:9\n" +
      "~340K followers | He ALREADY plays mood music behind his poems. Most natural fit on the list.\n" +
      "Reference his '\"A Friendly Reminder\"' video (14M views) in follow-up.\n" +
      "Follow-up wait: 3–5 days.",
  },
  {
    peopleId:    'reckFGQ23i1b5XQv6',
    outreachId:  'rec6vVhD4yUIXABZi',
    handle:      '@nitesinthepinkroom',
    stage:       'DM Planned',
    format:      'Poem + Song',
    track:       'Different',
    score:       26,
    dmScript:
      "hey — saw you're pushing to make poetry albums a thing and i'm fully with that. there's " +
      "an independent artist i work with named Ebril whose music feels like a poetry album should " +
      "— soft, emotional, cinematic. thought you might want to hear it for your content. sending " +
      "'Different' if you're curious. no pressure at all.",
    notes:
      "SCORE: 26/30 | Emotional:9 Visual:8 Music:9\n" +
      "Spoken word + ASMR pink aesthetic. Actively pushing 'poetry albums' movement.\n" +
      "Audience is hunting for their next artist obsession — highest emotional alignment.\n" +
      "Reference their 'let's make poetry albums popular' video directly.\n" +
      "Follow-up wait: 3–5 days.",
  },
  {
    peopleId:    'recm9sMEzWErfJqER',
    outreachId:  'rec1uyjGrHv7zfGhQ',
    handle:      '@kamasaki.jams',
    stage:       'DM Planned',
    format:      'Songs For This Feeling',
    track:       'Most ambient/neo soul track',
    score:       26,
    dmScript:
      "hey — love your R&B and neo soul collections. wanted to put an independent artist on your " +
      "radar: Ebril. his sound is somewhere between indie R&B, ambient, and late-night soul — " +
      "exactly the niche you curate. thought you might want to hear it before he blows up. " +
      "happy to send the tracks.",
    notes:
      "SCORE: 26/30 | Emotional:8 Visual:9 Music:9\n" +
      "Curates R&B/neo soul collections. Audience follows to discover music — highest trust ratio.\n" +
      "Goal: get Ebril included in their next collection video.\n" +
      "Follow-up wait: 5–7 days (posts less frequently).",
  },
  {
    peopleId:    'recYLUeoefGEWKPcY',
    outreachId:  'recZrnGbcDtS7Mvlu',
    handle:      '@alltheferalfawns',
    stage:       'DM Planned',
    format:      'Slow Morning',
    track:       'Most ambient/gentle track',
    score:       25,
    dmScript:
      "hey anna grace — your farm morning content is genuinely the most calming thing on tiktok. " +
      "i work with an independent artist named Ebril and think his music would be the perfect " +
      "soundtrack for your aesthetic — slow, soft, emotional indie R&B. sending 'Different' in " +
      "case you want to use it in a morning video — no brief or anything, just thought it fit your vibe.",
    notes:
      "SCORE: 25/30 | Emotional:8 Visual:9 Music:8\n" +
      "183K followers | Cottagecore barn life, Virginia. Fairycore/soft living aesthetic.\n" +
      "Audience seeking sonic escapism — Ebril's music IS that escape.\n" +
      "Suggested hashtags: #slowliving #morningaesthetic #cottagecore #soulsound\n" +
      "Follow-up wait: 5–7 days, reference a specific recent video.",
  },
  {
    peopleId:    'recHmplLozAoScQmh',
    outreachId:  'rec3w7RWKR9SVkCS5',
    handle:      '@ethanjewell',
    stage:       'DM Planned',
    format:      'Poem + Song',
    track:       'Different',
    score:       25,
    dmScript:
      "hey ethan — your work pairing poetry with piano is really beautiful. i work with an " +
      "independent artist named Ebril who makes indie R&B with a similar emotional depth. " +
      "wanted to share his music in case it resonates — no agenda, genuinely thought the sounds " +
      "might connect with your work. happy to send over 'Different'.",
    notes:
      "SCORE: 25/30 | Emotional:9 Visual:7 Music:9\n" +
      "~700K followers — biggest organic reach play (after @raeganspoetry).\n" +
      "NOTE: May have a manager at this size. Check TikTok bio / Linktree before DM.\n" +
      "Follow-up wait: 5–7 days.",
  },
  {
    peopleId:    'reccwaprjwvStBYAO',
    outreachId:  'rec3mEfkLfgPFFr2f',
    handle:      '@catarinehancock',
    stage:       'DM Planned',
    format:      'Poem + Song',
    track:       'On My Own',
    score:       25,
    dmScript:
      "hey — your poetry on heartbreak and healing really hits. i work with an independent artist " +
      "named Ebril whose music sits in that same space — bittersweet, introspective, soft. thought " +
      "your audience might feel it. want me to send over 'On My Own'?",
    notes:
      "SCORE: 25/30 | Emotional:9 Visual:7 Music:9\n" +
      "Books: 'Sometimes I Fall Asleep Thinking About You', 'I Gave Myself the World'.\n" +
      "Comment sections full of personal stories — deeply invested audience.\n" +
      "Reference her books in follow-up to show you know her work.\n" +
      "Follow-up wait: 3–5 days.",
  },
  {
    peopleId:    'receenrdnRY2rmS33',
    outreachId:  'recxNOnQvFnaqcaBM',
    handle:      '@socialshonjae',
    stage:       'DM Planned',
    format:      'Songs For This Feeling',
    track:       'Different',
    score:       25,
    dmScript:
      "hey shon jae — your neo soul playlist content is exactly how i discover new music. wanted " +
      "to share an independent artist named Ebril with you — his sound would fit right into your " +
      "curation. want me to send over 'Different'?",
    notes:
      "SCORE: 25/30 | Emotional:8 Visual:9 Music:8\n" +
      "Neo soul playlist content. Audience builds playlists from his recs.\n" +
      "Songs seeded here compound organically over weeks.\n" +
      "Goal: Ebril included in a 'create your neo soul playlist' video.\n" +
      "Follow-up wait: 5–7 days.",
  },
  {
    peopleId:    'rec1p89fPkhGXjqcb',
    outreachId:  'reczxDKHMnAXjIGec',
    handle:      '@raeganspoetry',
    stage:       'Identified',
    format:      'Poem + Song',
    track:       'TBD — wait for right release',
    score:       23,
    dmScript:
      "[HOLD — DO NOT REACH OUT YET]\n\n" +
      "Wait for Ebril's most romantic/longing track release.\n\n" +
      "When ready DM: \"hey raegan — huge fan of Lover Girl. i work with an independent artist " +
      "named Ebril and just thought your audience might love him — his music has that same ache. " +
      "sending '[TRACK]' in case it resonates. no ask, just thought it fit.\"\n\n" +
      "Better play: reply in her comments with a song rec when her post emotionally aligns.",
    notes:
      "SCORE: 23/30 — MONITOR | Emotional:9 Visual:6 Music:8\n" +
      "3.3M followers | Raegan Fordemwalt. Viral with 'i just want you' (15M views).\n" +
      "Books: 'Lover Girl' (#1 Amazon poetry), 'Prince of Hearts' (2025).\n" +
      "HOLD: risk of looking like a push. Wait for the right moment or organic comment entry.",
  },
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        Authorization:  `Bearer ${API_KEY}`,
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

const meta  = (method, path, body) => request(method, `https://api.airtable.com/v0/meta${path}`, body);
const table = (method, tableId, path, body) =>
  request(method, `https://api.airtable.com/v0/${BASE_ID}/${tableId}${path ? '/' + path : ''}`, body);

// ── Step 1: Create table ──────────────────────────────────────────────────────

async function createTable() {
  console.log('① Creating UGC Pipeline table…');

  const spec = {
    name: 'UGC Pipeline',
    fields: [
      { name: 'Creator Handle', type: 'singleLineText' },
      {
        name: 'UGC Stage',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Identified',       color: 'grayLight2'   },
            { name: 'DM Planned',       color: 'blueLight2'   },
            { name: 'DM Sent',          color: 'cyanLight2'   },
            { name: 'Replied',          color: 'tealLight2'   },
            { name: 'Brief Sent',       color: 'greenLight2'  },
            { name: 'Content Approved', color: 'yellowLight2' },
            { name: 'Posted',           color: 'orangeLight2' },
            { name: 'Tracking',         color: 'pinkLight2'   },
            { name: 'Done',             color: 'purpleLight2' },
          ],
        },
      },
      {
        name: 'Format',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Poem + Song',            color: 'blueLight2'   },
            { name: 'Slow Morning',           color: 'greenLight2'  },
            { name: 'Songs For This Feeling', color: 'purpleLight2' },
            { name: 'Custom',                 color: 'grayLight2'   },
          ],
        },
      },
      { name: 'Track Assigned', type: 'singleLineText' },
      { name: 'DM Script',      type: 'multilineText'  },
      { name: 'Post URL',       type: 'url'            },
      {
        name: 'Post Date',
        type: 'date',
        options: { dateFormat: { name: 'local' } },
      },
      { name: 'Sound Uses Generated', type: 'number',   options: { precision: 0 } },
      { name: 'Post Views',           type: 'number',   options: { precision: 0 } },
      { name: 'Fee Agreed',           type: 'currency', options: { precision: 2, symbol: '$' } },
      { name: 'Priority Score',       type: 'number',   options: { precision: 0 } },
      { name: 'Notes',                type: 'multilineText' },
    ],
  };

  const result = await meta('POST', `/bases/${BASE_ID}/tables`, spec);
  console.log(`   Table created → ${result.id}`);
  return result;
}

// ── Step 2: Add linked record fields ─────────────────────────────────────────

async function addLinkedFields(tableId) {
  console.log('② Adding linked record fields…');

  const links = [
    { name: 'Creator',  linkedTableId: PEOPLE_TABLE    },
    { name: 'Campaign', linkedTableId: CAMPAIGNS_TABLE },
    { name: 'Outreach', linkedTableId: OUTREACH_TABLE  },
  ];

  const fieldIds = {};
  for (const { name, linkedTableId } of links) {
    const f = await meta('POST', `/bases/${BASE_ID}/tables/${tableId}/fields`, {
      name,
      type: 'multipleRecordLinks',
      options: { linkedTableId },
    });
    fieldIds[name] = f.id;
    console.log(`   ${name} → ${f.id}`);
  }
  return fieldIds;
}

// ── Step 3: Create views ──────────────────────────────────────────────────────

async function createViews(tableId) {
  console.log('③ Creating views…');

  const views = [
    { name: '📋 Pipeline Board',   type: 'kanban' },
    { name: '⚡ Active Outreach',  type: 'grid'   },
    { name: '📊 Results Tracker',  type: 'grid'   },
  ];

  for (const v of views) {
    try {
      await meta('POST', `/bases/${BASE_ID}/tables/${tableId}/views`, v);
      console.log(`   ${v.name}`);
    } catch (e) {
      // Some Airtable plans restrict view creation via API — not fatal
      console.log(`   ${v.name} — skipped (${e.message.slice(0, 60)})`);
    }
  }
}

// ── Step 4: Populate records ──────────────────────────────────────────────────

async function populateRecords(tableId, fieldMap) {
  console.log('④ Populating creator pipeline records…');

  const records = CREATORS.map((c) => ({
    fields: {
      [fieldMap['Creator Handle']]:       c.handle,
      [fieldMap['UGC Stage']]:            c.stage,
      [fieldMap['Format']]:               c.format,
      [fieldMap['Track Assigned']]:       c.track,
      [fieldMap['DM Script']]:            c.dmScript,
      [fieldMap['Priority Score']]:       c.score,
      [fieldMap['Notes']]:                c.notes,
      [fieldMap['Creator']]:              [c.peopleId],
      [fieldMap['Campaign']]:             [CAMPAIGN_RECORD],
      [fieldMap['Outreach']]:             [c.outreachId],
    },
  }));

  for (let i = 0; i < records.length; i += 10) {
    const chunk  = records.slice(i, i + 10);
    const result = await table('POST', tableId, '', { records: chunk });
    console.log(`   Created ${result.records.length} record(s)`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== UGC Pipeline Setup ===\n');

  if (!API_KEY) {
    console.error('Error: AIRTABLE_API_KEY must be set in .env');
    process.exit(1);
  }

  // 1. Create table
  const newTable = await createTable();
  const tableId  = newTable.id;

  // Build initial field map
  const fieldMap = {};
  for (const f of newTable.fields) fieldMap[f.name] = f.id;

  // 2. Add linked fields
  const linkedIds = await addLinkedFields(tableId);
  Object.assign(fieldMap, linkedIds);

  // 3. Create views
  await createViews(tableId);

  // 4. Populate records
  await populateRecords(tableId, fieldMap);

  console.log('\n=== Setup Complete ===');
  console.log(`UGC Pipeline table ID: ${tableId}`);
  console.log('\nRemaining manual steps in Airtable (5 min):');
  console.log('  INTERFACE — build 3 pages:');
  console.log('    • Pipeline Board  → Record Layout, UGC Pipeline, kanban view');
  console.log('    • Creator Detail  → Record Detail (click-through from board)');
  console.log('    • Campaign Stats  → Number Charts: count by stage, total Sound Uses, total Views');
  console.log('\n  AUTOMATIONS — add 2 triggers:');
  console.log('    • UGC Stage → "Posted"   : create Moments record (Impact=High, Brand=Ebril)');
  console.log('    • UGC Stage → "DM Sent"  : update People.Last Interaction Date = today');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
