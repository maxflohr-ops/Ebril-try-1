#!/usr/bin/env node
/**
 * cobalt-client.js
 * Media ingestion layer for the Florra creator research stack.
 *
 * Self-hosted Cobalt (https://github.com/imputnet/cobalt) downloads short-form
 * video and audio from TikTok, Instagram, YouTube Shorts, and more — without
 * watermarks, without accounts, and without rate-limiting from platform apps.
 *
 * ── Why Cobalt in this pipeline ──────────────────────────────────────────────
 *
 * Chartex surfaces *who* is using a sound and *how well* they're doing, but
 * gives no post-level URLs. Cobalt bridges that gap: once a human finds or
 * an external tool surfaces the actual post URL, Cobalt ingests the asset into
 * a structured local library that powers briefs, reports, and CRM enrichment.
 *
 * ── Use cases ────────────────────────────────────────────────────────────────
 *
 *  1. Manual video queuing
 *     You open TikTok, see a great creator post, add the URL:
 *     `npm run cobalt:add -- --url https://tiktok.com/@handle/video/12345`
 *
 *  2. Campaign archival
 *     A creator goes live. Download every post they made with the sound:
 *     `npm run cobalt:batch -- --file urls.txt --tag campaign-march-2025`
 *
 *  3. Sound page capture
 *     TikTok sound pages list every video using a sound.
 *     `npm run cobalt:add -- --url "https://www.tiktok.com/music/Different-7412360983" --sound "Different"`
 *
 *  4. Audio extraction
 *     Pull just the audio from a creator's video to hear how they mixed the track:
 *     `npm run cobalt:add -- --url <url> --mode audio`
 *
 *  5. Brief generation
 *     After a few downloads land in the library, compile a creator brief:
 *     `npm run cobalt:brief -- --creator @slowsundayvibe`
 *
 *  6. Competitive intelligence
 *     Download competitor artists' top UGC examples to study what formats work:
 *     `npm run cobalt:batch -- --file competitor-ugc.txt --tag competitor-intel`
 *
 *  7. Cross-platform asset preparation
 *     Download from TikTok (no watermark) for clean re-use on Instagram/YouTube.
 *
 *  8. Post-DM monitoring queue
 *     When a creator confirms they'll post, add a "monitor" entry — a reminder
 *     to come back and archive the live post once it's up.
 *
 *  9. Rising sound examples
 *     For each rising sound in getRisingSounds(), pull the topCreator's profile
 *     URL into a visit queue so a human can review and queue specific posts.
 *
 * 10. Campaign portfolio report
 *     At end of campaign, build an HTML report of all archived UGC:
 *     `npm run cobalt:report -- --tag campaign-march-2025`
 *
 * ── Cobalt setup ─────────────────────────────────────────────────────────────
 *
 *  docker run -d \
 *    -e API_URL=http://localhost:9000 \
 *    -p 9000:9000 \
 *    --name cobalt \
 *    ghcr.io/imputnet/cobalt:latest
 *
 *  Then set COBALT_URL=http://localhost:9000 in .env
 *
 * ── Architecture ─────────────────────────────────────────────────────────────
 *
 *  cobalt-client.js      — Cobalt API wrapper, queue manager, CLI entry point
 *  content-library.js    — Local archive: file org, metadata, index, dedup
 *  brief-generator.js    — Creator briefs, DM scripts, sound reports, decks
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const ContentLibrary  = require('./content-library');
const BriefGenerator  = require('./brief-generator');

const COBALT_URL     = process.env.COBALT_URL || 'http://localhost:9000';
const COBALT_API_KEY = process.env.COBALT_API_KEY || null;   // optional for self-hosted
const LIBRARY_ROOT   = path.join(__dirname, '..', 'content-library');
const QUEUE_FILE     = path.join(LIBRARY_ROOT, 'queue.json');

// How many concurrent downloads to run at once — keep low to avoid IP blocks
const DEFAULT_CONCURRENCY = 2;

// ── Cobalt API ────────────────────────────────────────────────────────────────

/**
 * Send a URL to Cobalt and receive a download-ready response.
 *
 * Cobalt response shapes:
 *   { status: 'tunnel',   url, filename }           — direct stream
 *   { status: 'redirect', url }                     — redirect to CDN
 *   { status: 'picker',   picker: [{url,thumb}], audio? } — gallery/carousel
 *   { status: 'error',    error: { code, context } }
 */
async function cobaltRequest(sourceUrl, opts = {}) {
  const body = JSON.stringify({
    url:            sourceUrl,
    videoQuality:   opts.quality       || '720',
    downloadMode:   opts.mode          || 'auto',  // 'auto' | 'audio' | 'mute'
    audioFormat:    opts.audioFormat   || 'mp3',
    audioBitrate:   opts.audioBitrate  || '128',
    videoFormat:    opts.videoFormat   || 'mp4',
    tiktokFullAudio: opts.tiktokFullAudio || false,
  });

  const parsed   = new URL(COBALT_URL);
  const isHttps  = parsed.protocol === 'https:';
  const client   = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     '/',
      method:   'POST',
      headers: {
        'Accept':         'application/json',
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(COBALT_API_KEY ? { Authorization: `Api-Key ${COBALT_API_KEY}` } : {}),
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'error') {
            reject(new Error(`Cobalt error: ${parsed.error?.code} — ${JSON.stringify(parsed.error?.context)}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`Cobalt non-JSON response (${res.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Download a file from a URL (tunnel or redirect) to a local path.
 * Returns { bytes, durationMs }.
 */
async function downloadFile(downloadUrl, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const parsed  = new URL(downloadUrl);
  const client  = parsed.protocol === 'https:' ? https : http;
  const start   = Date.now();

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = (url) => {
      client.get(url, (res) => {
        // follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          return request(res.headers.location);
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        let bytes = 0;
        res.on('data', (c) => (bytes += c.length));
        file.on('finish', () => resolve({ bytes, durationMs: Date.now() - start }));
        file.on('error', reject);
      }).on('error', reject);
    };

    request(downloadUrl);
  });
}

// ── Queue management ──────────────────────────────────────────────────────────

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); }
  catch { return []; }
}

function saveQueue(queue) {
  fs.mkdirSync(LIBRARY_ROOT, { recursive: true });
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function queueStats(queue) {
  const pending   = queue.filter((e) => e.status === 'pending').length;
  const done      = queue.filter((e) => e.status === 'done').length;
  const failed    = queue.filter((e) => e.status === 'failed').length;
  const monitor   = queue.filter((e) => e.status === 'monitor').length;
  return { pending, done, failed, monitor, total: queue.length };
}

/**
 * Add one or more entries to the download queue.
 *
 * Entry fields:
 *   url          — source video URL (required)
 *   creator      — normalized handle without @ (optional but recommended)
 *   platform     — 'tiktok' | 'instagram' | 'youtube' (inferred from URL if omitted)
 *   sound        — sound / track title this video uses (optional)
 *   soundId      — Chartex track ID if known (optional)
 *   tag          — campaign tag or arbitrary label (optional)
 *   mode         — 'auto' | 'audio' | 'mute' (default: 'auto')
 *   note         — free-text note about why you added this (optional)
 *   status       — 'pending' | 'monitor' (default: 'pending')
 *                  'monitor' = URL not yet known; added as a reminder to check back
 *   airtableId   — linked People record ID if known (optional)
 */
function enqueue(entries) {
  const queue = loadQueue();

  // Dedup by URL
  const existingUrls = new Set(queue.map((e) => e.url));
  let added = 0;

  for (const entry of (Array.isArray(entries) ? entries : [entries])) {
    if (existingUrls.has(entry.url)) {
      console.log(`  skip (already queued): ${entry.url}`);
      continue;
    }
    queue.push({
      id:          `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      addedAt:     new Date().toISOString(),
      status:      entry.status || 'pending',
      platform:    entry.platform || guessPlatform(entry.url),
      url:         entry.url,
      creator:     entry.creator   ? normalizeHandle(entry.creator)  : null,
      sound:       entry.sound     || null,
      soundId:     entry.soundId   || null,
      tag:         entry.tag       || null,
      mode:        entry.mode      || 'auto',
      note:        entry.note      || null,
      airtableId:  entry.airtableId || null,
    });
    existingUrls.add(entry.url);
    added++;
  }

  saveQueue(queue);
  return added;
}

function guessPlatform(url = '') {
  if (url.includes('tiktok.com'))   return 'tiktok';
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be'))     return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com'))        return 'twitter';
  return 'unknown';
}

function normalizeHandle(h) {
  return (h || '').toLowerCase().replace(/^@/, '').trim();
}

// ── Process queue ─────────────────────────────────────────────────────────────

/**
 * Work through pending queue entries, downloading and archiving each one.
 * Runs up to `concurrency` downloads in parallel.
 *
 * @param {{ limit?: number, concurrency?: number, dryRun?: boolean }} opts
 */
async function processQueue(opts = {}) {
  const { limit = Infinity, concurrency = DEFAULT_CONCURRENCY, dryRun = false } = opts;
  const library = new ContentLibrary(LIBRARY_ROOT);
  const queue   = loadQueue();
  const pending = queue.filter((e) => e.status === 'pending').slice(0, limit);

  if (pending.length === 0) {
    console.log('Queue is empty — nothing to download.');
    return { downloaded: 0, failed: 0 };
  }

  console.log(`Processing ${pending.length} item(s) (concurrency: ${concurrency})…\n`);
  if (dryRun) { console.log('[dry-run — no downloads]\n'); }

  let downloaded = 0;
  let failed     = 0;

  // Process in concurrency-sized batches
  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(batch.map(async (entry) => {
      const label = `[${entry.creator || 'unknown'}] ${entry.url.slice(0, 60)}…`;
      console.log(`↓ ${label}`);

      if (dryRun) return;

      try {
        const result = await ingestEntry(entry, library);
        // Mark done in queue
        const qEntry = queue.find((e) => e.id === entry.id);
        if (qEntry) {
          qEntry.status       = 'done';
          qEntry.completedAt  = new Date().toISOString();
          qEntry.libraryId    = result.id;
          qEntry.filePath     = result.filePath;
          qEntry.bytes        = result.bytes;
        }
        console.log(`  ✓ ${(result.bytes / 1024).toFixed(0)} KB → ${result.filePath}`);
        downloaded++;
      } catch (err) {
        const qEntry = queue.find((e) => e.id === entry.id);
        if (qEntry) {
          qEntry.status    = 'failed';
          qEntry.failedAt  = new Date().toISOString();
          qEntry.error     = err.message;
        }
        console.error(`  ✗ ${err.message}`);
        failed++;
      }
    }));

    saveQueue(queue);
  }

  return { downloaded, failed };
}

/**
 * Resolve a single queue entry: hit Cobalt, download the file(s), add to library.
 */
async function ingestEntry(entry, library) {
  // Ask Cobalt where to get the asset
  const cobaltRes = await cobaltRequest(entry.url, { mode: entry.mode });

  let downloadUrl, filename;

  if (cobaltRes.status === 'tunnel' || cobaltRes.status === 'redirect') {
    downloadUrl = cobaltRes.url;
    filename    = cobaltRes.filename || buildFilename(entry);
  } else if (cobaltRes.status === 'picker') {
    // Gallery post — take the first item (usually the highest quality)
    // Each picker item: { type: 'video'|'photo', url, thumb }
    downloadUrl = cobaltRes.picker[0].url;
    filename    = `${buildFilename(entry)}_1of${cobaltRes.picker.length}`;
    // If there are multiple items, enqueue the rest as follow-on queue entries
    if (cobaltRes.picker.length > 1) {
      const followOns = cobaltRes.picker.slice(1).map((item, idx) => ({
        ...entry,
        id:     undefined,
        url:    item.url,
        note:   `${entry.note || ''} (picker item ${idx + 2}/${cobaltRes.picker.length})`,
        status: 'pending',
      }));
      enqueue(followOns);
    }
  } else {
    throw new Error(`Unexpected Cobalt status: ${cobaltRes.status}`);
  }

  const destPath = library.resolveDestPath(entry, filename);
  const { bytes, durationMs } = await downloadFile(downloadUrl, destPath);

  // Register in library index
  const libEntry = library.addEntry({
    sourceUrl:    entry.url,
    filePath:     destPath,
    filename,
    bytes,
    durationMs,
    platform:     entry.platform,
    creator:      entry.creator,
    sound:        entry.sound,
    soundId:      entry.soundId,
    tag:          entry.tag,
    mode:         entry.mode,
    note:         entry.note,
    airtableId:   entry.airtableId,
    downloadedAt: new Date().toISOString(),
  });

  return { ...libEntry, bytes, filePath: destPath };
}

function buildFilename(entry) {
  const ts      = Date.now();
  const creator = entry.creator || 'unknown';
  const sound   = entry.sound
    ? `_${entry.sound.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}`
    : '';
  return `${creator}${sound}_${ts}`;
}

// ── Profile visit queue (for creators without known post URLs) ────────────────

/**
 * Add a creator's profile URL to a "visit" queue — a lightweight reminder that
 * you should open this profile, find their best posts, and add specific URLs.
 *
 * This is the bridge between Chartex metadata (no post URLs) and Cobalt ingestion:
 * creator-research.js calls this automatically for every qualified creator.
 */
function queueProfileVisit(creators) {
  const queue   = loadQueue();
  const existing = new Set(queue.map((e) => e.url));
  let added = 0;

  for (const c of (Array.isArray(creators) ? creators : [creators])) {
    const profileUrl = buildProfileUrl(c.username, c.platform);
    if (!profileUrl || existing.has(profileUrl)) continue;

    queue.push({
      id:       `visit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      addedAt:  new Date().toISOString(),
      status:   'monitor',   // not downloadable by Cobalt — manual review needed
      platform: c.platform,
      url:      profileUrl,
      creator:  normalizeHandle(c.username),
      sound:    c.soundTitle   || null,
      soundId:  c.soundId      || null,
      tag:      'research',
      note:
        `Score ${c._score || '?'}/100 | ${c.followers?.toLocaleString() || '?'} followers | ` +
        `${c.postCount || '?'} posts with "${c.soundTitle || 'sound'}" | ` +
        `Trend: ${c.soundTrend || '?'}. ` +
        `Visit profile, find their best ${c.soundTitle || 'sound'} video, ` +
        `then: npm run cobalt:add -- --url <post-url> --creator ${c.username}`,
      airtableId: c._airtableId || null,
    });
    existing.add(profileUrl);
    added++;
  }

  saveQueue(queue);
  return added;
}

function buildProfileUrl(username, platform) {
  platform = (platform || '').toLowerCase();
  if (platform === 'tiktok')    return `https://www.tiktok.com/@${username}`;
  if (platform === 'instagram') return `https://www.instagram.com/${username}/`;
  if (platform === 'youtube')   return `https://www.youtube.com/@${username}`;
  return null;
}

// ── Sound page queuing ────────────────────────────────────────────────────────

/**
 * TikTok sound pages list every video using a sound and are themselves
 * downloadable via Cobalt (Cobalt extracts individual videos from the page).
 *
 * If you have the TikTok sound ID (from track.platforms.tiktok.soundId), call this
 * to queue the sound page URL so Cobalt can pull the top videos from it.
 *
 * URL format: https://www.tiktok.com/music/{slug}-{soundId}
 */
function queueSoundPage(soundTitle, tiktokSoundId, opts = {}) {
  if (!tiktokSoundId) return 0;
  const slug = soundTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const url  = `https://www.tiktok.com/music/${slug}-${tiktokSoundId}`;
  return enqueue([{
    url,
    sound:   soundTitle,
    tag:     opts.tag || 'sound-page',
    mode:    opts.mode || 'auto',
    note:    opts.note || `Sound page for "${soundTitle}" — top videos by velocity`,
    status:  'pending',
  }]);
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const library = new ContentLibrary(LIBRARY_ROOT);
  const briefs  = new BriefGenerator(library);

  // -- --add <url> [--creator handle] [--sound title] [--tag label] [--mode audio]
  if (args.includes('--add')) {
    const url     = args[args.indexOf('--add') + 1];
    const creator = argValue(args, '--creator');
    const sound   = argValue(args, '--sound');
    const tag     = argValue(args, '--tag');
    const mode    = argValue(args, '--mode');
    const note    = argValue(args, '--note');

    if (!url || url.startsWith('--')) {
      console.error('Usage: --add <url> [--creator handle] [--sound "title"] [--tag label]');
      process.exit(1);
    }

    const n = enqueue([{ url, creator, sound, tag, mode, note }]);
    if (n > 0) console.log(`✓ Queued: ${url}`);
    const stats = queueStats(loadQueue());
    console.log(`Queue: ${stats.pending} pending, ${stats.done} done, ${stats.monitor} to visit`);
    return;
  }

  // -- --batch --file urls.txt [--tag label] [--mode audio]
  if (args.includes('--batch')) {
    const file    = argValue(args, '--file');
    const tag     = argValue(args, '--tag');
    const mode    = argValue(args, '--mode');
    const creator = argValue(args, '--creator');

    if (!file) { console.error('Usage: --batch --file <path> [--tag label]'); process.exit(1); }
    if (!fs.existsSync(file)) { console.error(`File not found: ${file}`); process.exit(1); }

    const urls    = fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
    const entries = urls.map((url) => ({ url, tag, mode, creator }));
    const n       = enqueue(entries);
    console.log(`✓ Added ${n} new URL(s) to queue (${urls.length - n} already queued)`);
    return;
  }

  // -- --sound-page <tiktok-sound-id> --sound "title" [--tag label]
  if (args.includes('--sound-page')) {
    const soundId = args[args.indexOf('--sound-page') + 1];
    const sound   = argValue(args, '--sound') || 'Unknown Sound';
    const tag     = argValue(args, '--tag');
    const n       = queueSoundPage(sound, soundId, { tag });
    console.log(n > 0 ? `✓ Sound page queued for "${sound}" (ID: ${soundId})` : 'Already queued');
    return;
  }

  // -- --process [--limit=N] [--concurrency=N] [--dry-run]
  if (args.includes('--process')) {
    const limit       = parseInt(argValue(args, '--limit')       || '1000', 10);
    const concurrency = parseInt(argValue(args, '--concurrency') || `${DEFAULT_CONCURRENCY}`, 10);
    const dryRun      = args.includes('--dry-run');

    const { downloaded, failed } = await processQueue({ limit, concurrency, dryRun });
    console.log(`\nDone — ${downloaded} downloaded, ${failed} failed`);

    if (failed > 0) {
      console.log('Failed entries still in queue with status "failed". Fix URLs and re-run.');
    }
    return;
  }

  // -- --audit
  if (args.includes('--audit')) {
    const queue   = loadQueue();
    const qs      = queueStats(queue);
    const libStats = library.stats();

    console.log('=== Content Library Audit ===\n');
    console.log('Queue:');
    console.log(`  Pending:  ${qs.pending}`);
    console.log(`  Monitor:  ${qs.monitor}  (profiles to visit — no post URL yet)`);
    console.log(`  Done:     ${qs.done}`);
    console.log(`  Failed:   ${qs.failed}`);
    console.log('');
    console.log('Library:');
    console.log(`  Total files:    ${libStats.totalFiles}`);
    console.log(`  Total size:     ${(libStats.totalBytes / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Creators:       ${libStats.creators}`);
    console.log(`  Sounds tracked: ${libStats.sounds}`);
    console.log(`  Platforms:      ${Object.entries(libStats.byPlatform).map(([k, v]) => `${k}:${v}`).join(', ')}`);
    console.log(`  Tags:           ${Object.keys(libStats.byTag).join(', ')}`);

    if (qs.monitor > 0) {
      console.log('\n── Visit Queue (profiles to review) ──────────────────────────');
      queue
        .filter((e) => e.status === 'monitor')
        .forEach((e) => {
          console.log(`  ${e.url}`);
          console.log(`    ${e.note || '(no note)'}`);
        });
    }
    return;
  }

  // -- --brief --creator @handle [--output ./brief.md]
  if (args.includes('--brief')) {
    const handle = argValue(args, '--creator') || argValue(args, '--brief');
    const output = argValue(args, '--output');

    if (!handle) {
      console.error('Usage: --brief --creator @handle [--output path/to/brief.md]');
      process.exit(1);
    }

    const brief = await briefs.buildCreatorBrief(normalizeHandle(handle));
    const md    = briefs.renderMarkdown(brief);

    if (output) {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, md);
      console.log(`Brief written to ${output}`);
    } else {
      console.log(md);
    }
    return;
  }

  // -- --report [--tag label] [--output ./report.md]
  if (args.includes('--report')) {
    const tag    = argValue(args, '--tag');
    const output = argValue(args, '--output');
    const md     = await briefs.buildReport({ tag });

    if (output) {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, md);
      console.log(`Report written to ${output}`);
    } else {
      console.log(md);
    }
    return;
  }

  // No matching command — show help
  console.log([
    '=== cobalt-client.js ===',
    '',
    'Commands:',
    '  --add <url>            Add URL to download queue',
    '    --creator @handle    Link to creator',
    '    --sound "Title"      Tag the sound being used',
    '    --tag label          Campaign or category tag',
    '    --mode auto|audio    Download mode (default: auto)',
    '    --note "text"        Free-text context note',
    '',
    '  --batch --file urls.txt  Bulk-add URLs from a text file (one per line)',
    '    --tag label            Optional tag for all entries',
    '',
    '  --sound-page <tiktok-sound-id>  Queue the TikTok sound page',
    '    --sound "Title"               Sound name (for URL construction)',
    '',
    '  --process              Download all pending queue entries',
    '    --limit=N            Only process N items',
    '    --concurrency=N      Parallel downloads (default: 2)',
    '    --dry-run            Preview without downloading',
    '',
    '  --audit                Show queue stats and library inventory',
    '',
    '  --brief --creator @handle  Generate a creator brief from library content',
    '    --output path/to/brief.md',
    '',
    '  --report               Build a library report',
    '    --tag label          Filter by campaign tag',
    '    --output path/to/report.md',
    '',
    'Env vars:',
    '  COBALT_URL      Your Cobalt instance (default: http://localhost:9000)',
    '  COBALT_API_KEY  Optional API key for your Cobalt instance',
    '',
    'Docker quick-start:',
    '  docker run -d -e API_URL=http://localhost:9000 -p 9000:9000 --name cobalt \\',
    '    ghcr.io/imputnet/cobalt:latest',
  ].join('\n'));
}

function argValue(args, flag) {
  const i = args.indexOf(flag);
  if (i !== -1 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  // Also support --flag=value form
  const prefixed = args.find((a) => a.startsWith(`${flag}=`));
  if (prefixed) return prefixed.slice(flag.length + 1);
  return null;
}

// ── Exports (for use by creator-research.js) ──────────────────────────────────

module.exports = {
  enqueue,
  queueProfileVisit,
  queueSoundPage,
  processQueue,
  cobaltRequest,
  loadQueue,
  saveQueue,
  queueStats,
  normalizeHandle,
  buildProfileUrl,
};

if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
