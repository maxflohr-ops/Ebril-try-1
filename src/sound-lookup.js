/**
 * sound-lookup.js
 * Resolves any TikTok URL (short link, video, or sound page) into a
 * Chartex track object + the creator list for that sound.
 *
 * Supported input formats:
 *   https://vt.tiktok.com/ZS9R27PmQ/         — short link (auto-resolved)
 *   https://www.tiktok.com/music/Name-7412360983  — sound page
 *   https://www.tiktok.com/@user/video/7412360983 — video page
 *   7412360983                                — bare TikTok sound ID
 *
 * Resolution chain:
 *   1. Follow redirects on short URLs until we reach a stable TikTok URL
 *   2. Classify the URL: sound page vs. video page vs. bare ID
 *   3. Extract the sound ID (sound page) or video ID (video page)
 *   4. Call Chartex to look up the track
 *   5. Return the track + usage + creators
 */

const https = require('https');
const http  = require('http');

// ── URL resolution ────────────────────────────────────────────────────────────

/**
 * Follow HTTP redirects until we reach a non-redirect response or maxRedirects.
 * Uses HEAD requests to avoid downloading page bodies.
 * Falls back to GET if the server doesn't honour HEAD (some TikTok CDN nodes don't).
 */
async function resolveUrl(startUrl, maxRedirects = 10) {
  let url = startUrl;

  for (let i = 0; i < maxRedirects; i++) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid URL after ${i} redirect(s): ${url}`);
    }

    const client = parsed.protocol === 'https:' ? https : http;

    const { statusCode, location } = await new Promise((resolve, reject) => {
      const options = {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'HEAD',
        headers: {
          // Mimic a mobile browser — TikTok short links sometimes require this
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
            'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          Accept: 'text/html,application/xhtml+xml',
        },
      };

      const req = client.request(options, (res) => {
        resolve({ statusCode: res.statusCode, location: res.headers.location });
        res.resume(); // drain body
      });
      req.setTimeout(8000, () => { req.destroy(new Error('Timeout resolving URL')); });
      req.on('error', reject);
      req.end();
    });

    if (statusCode >= 300 && statusCode < 400 && location) {
      // Resolve relative redirects against current URL
      url = new URL(location, url).toString();
    } else {
      break; // arrived
    }
  }

  return url;
}

// ── URL parsing ───────────────────────────────────────────────────────────────

/**
 * Parse a resolved TikTok URL.
 * Returns one of:
 *   { type: 'sound', soundId: '7412360983', slug: 'different' }
 *   { type: 'video', videoId: '7412360983', username: 'handle' }
 *   null — not a recognisable TikTok URL
 */
function parseTikTokUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('tiktok.com')) return null;

    // Sound page: /music/{slug}-{numericId}
    // The numeric ID is the last segment after the final dash, all digits
    const soundMatch = u.pathname.match(/^\/music\/(.+)-(\d{10,})(?:\/.*)?$/);
    if (soundMatch) {
      return { type: 'sound', soundId: soundMatch[2], slug: soundMatch[1] };
    }

    // Video page: /@{username}/video/{numericId}
    const videoMatch = u.pathname.match(/^\/@([^/]+)\/video\/(\d+)/);
    if (videoMatch) {
      return { type: 'video', videoId: videoMatch[2], username: videoMatch[1] };
    }

    // Profile page: /@{username}
    const profileMatch = u.pathname.match(/^\/@([^/]+)\/?$/);
    if (profileMatch) {
      return { type: 'profile', username: profileMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}

/** Check whether a string looks like a bare numeric TikTok sound ID. */
function isBareId(str) {
  return /^\d{10,}$/.test(str.trim());
}

// ── Main resolution entry point ───────────────────────────────────────────────

/**
 * Take any TikTok input (URL or bare ID) and return a parsed descriptor.
 * Automatically follows short links.
 *
 * @param {string} input  URL or bare numeric sound ID
 * @returns {{ type, soundId?, videoId?, username?, resolvedUrl, rawInput }}
 */
async function resolveTikTokInput(input) {
  input = input.trim();

  // Bare sound ID
  if (isBareId(input)) {
    return { type: 'sound', soundId: input, resolvedUrl: null, rawInput: input };
  }

  // Needs to be a URL from here on
  let url = input;
  if (!url.startsWith('http')) url = `https://${url}`;

  // Resolve short links and any other redirects
  const isShort = url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com');
  const resolvedUrl = isShort || !url.includes('tiktok.com')
    ? await resolveUrl(url)
    : url;

  const parsed = parseTikTokUrl(resolvedUrl);

  if (!parsed) {
    throw new Error(
      `Could not parse TikTok URL after resolution.\n` +
      `  Input:    ${input}\n` +
      `  Resolved: ${resolvedUrl}\n\n` +
      `Supported formats:\n` +
      `  • Short link:   https://vt.tiktok.com/...\n` +
      `  • Sound page:   https://www.tiktok.com/music/Name-7412360983\n` +
      `  • Video page:   https://www.tiktok.com/@user/video/7412360983\n` +
      `  • Bare ID:      7412360983`
    );
  }

  return { ...parsed, resolvedUrl, rawInput: input };
}

// ── Chartex lookup ────────────────────────────────────────────────────────────

/**
 * Resolve TikTok input → Chartex track → creators.
 *
 * @param {string} input          Any TikTok URL or bare sound ID
 * @param {ChartexClient} chartex Configured Chartex client
 * @param {{ limit?: number }} opts
 * @returns {{
 *   track:    { id, title, artistName, ... },
 *   usage:    { tiktok: { soundUses, weeklyVelocity, trend } },
 *   creators: Creator[],
 *   resolvedUrl: string,
 *   parsedAs: string,
 * }}
 */
async function lookupSoundCreators(input, chartex, opts = {}) {
  const { limit = 50 } = opts;

  console.log(`Resolving: ${input}`);
  const desc = await resolveTikTokInput(input);

  console.log(`  → Parsed as: ${desc.type}${desc.soundId ? ` (sound ID: ${desc.soundId})` : ''}${desc.videoId ? ` (video ID: ${desc.videoId})` : ''}`);
  if (desc.resolvedUrl && desc.resolvedUrl !== input) {
    console.log(`  → Resolved to: ${desc.resolvedUrl}`);
  }

  let track;

  if (desc.type === 'sound') {
    track = await chartex.searchByTikTokSoundId(desc.soundId);
  } else if (desc.type === 'video') {
    console.log('  ℹ  Video URL detected — looking up via video ID (Chartex finds the sound used)');
    track = await chartex.searchByTikTokVideoId(desc.videoId);
  } else if (desc.type === 'profile') {
    throw new Error(
      `That URL points to a creator profile (@${desc.username}), not a sound or video.\n` +
      `To find creators using a specific sound, paste the sound page URL or a video that uses the sound.`
    );
  } else {
    throw new Error(`Unrecognised TikTok URL type: ${desc.type}`);
  }

  if (!track) {
    throw new Error(
      `Sound not found in Chartex.\n` +
      `This could mean:\n` +
      `  • The sound hasn't been indexed yet (Chartex picks up sounds with 5K+ uses)\n` +
      `  • The TikTok ID changed (try the sound page URL instead of the short link)\n` +
      `  • The sound is region-locked and not visible in Chartex's dataset`
    );
  }

  console.log(`  ✓ Found in Chartex: "${track.title}"${track.artistName ? ` by ${track.artistName}` : ''}`);

  // Fetch usage + creators in parallel
  const [usage, creatorsRes] = await Promise.all([
    chartex.getTrackUsage(track.id),
    chartex.getTrackCreators(track.id, { limit }),
  ]);

  const creators = (creatorsRes.items || creatorsRes || []).map((c) => ({
    ...c,
    soundTitle:          track.title,
    artistName:          track.artistName || null,
    soundTrend:          usage?.tiktok?.trend || 'stable',
    soundWeeklyVelocity: usage?.tiktok?.weeklyVelocity || 0,
    sourceType:          'sound-url',
  }));

  return {
    track,
    usage,
    creators,
    resolvedUrl: desc.resolvedUrl,
    parsedAs:    desc.type,
  };
}

module.exports = { resolveTikTokInput, lookupSoundCreators, resolveUrl, parseTikTokUrl };
