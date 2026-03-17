/**
 * brief-generator.js
 * Turns content library entries into actionable creator briefs and reports.
 *
 * Outputs:
 *   Creator brief     — per-creator Markdown doc with DM script, content profile,
 *                       posting patterns, and sound usage analysis
 *   Sound report      — which content types + creators are driving a sound
 *   Campaign deck     — full portfolio of UGC examples for a tag/campaign
 *   Competitive intel — what formats work for sounds in an artist's lane
 */

const ContentLibrary = require('./content-library');

class BriefGenerator {
  constructor(library) {
    /** @type {ContentLibrary} */
    this.library = library;
  }

  // ── Creator brief ──────────────────────────────────────────────────────────

  /**
   * Build a structured brief for one creator from their library entries.
   * If no entries exist, a skeleton brief is returned with research prompts.
   */
  async buildCreatorBrief(handle) {
    const entries    = this.library.getCreatorEntries(handle);
    const profileUrl = this._guessProfileUrl(entries);

    const sounds   = [...new Set(entries.map((e) => e.sound).filter(Boolean))];
    const tags     = [...new Set(entries.map((e) => e.tag).filter(Boolean))];
    const types    = countBy(entries, 'contentType');
    const platforms = countBy(entries, 'platform');

    const postingHours = this._analyzePostingTimes(entries);
    const topSound     = sounds[0] || null;

    const hashtags = entries
      .flatMap((e) => ContentLibrary.extractHashtags(e.caption || ''))
      .reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {});
    const topHashtags = Object.entries(hashtags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([h]) => h);

    const dmScript = this._buildDMScript({
      handle,
      entries,
      topSound,
      contentTypes: Object.keys(types),
      platform: Object.keys(platforms)[0] || 'tiktok',
    });

    return {
      handle,
      profileUrl,
      entryCount:   entries.length,
      sounds,
      tags,
      contentTypes: types,
      platforms,
      postingHours,
      topHashtags,
      captions:     entries.map((e) => e.caption).filter(Boolean),
      files:        entries.map((e) => e.filePath).filter(Boolean),
      dmScript,
      generatedAt:  new Date().toISOString(),
    };
  }

  /**
   * Generate a personalized DM script based on what's in the library.
   *
   * The quality of the script scales with how much data is available:
   *   0 entries  → generic script with [placeholders]
   *   1–2 entries → reference the sound they used
   *   3+ entries → reference a specific video + their content style
   */
  _buildDMScript({ handle, entries, topSound, contentTypes, platform }) {
    const opener   = platform === 'tiktok' ? 'saw your TikTok' : 'saw your Reel';
    const soundRef = topSound ? `"${topSound}"` : 'that sound';
    const videoRef = entries.length >= 3
      ? `your ${contentTypes[0] || 'recent'} content`
      : `the way you used ${soundRef}`;

    const lines = [];

    lines.push(`Hey @${handle}! I came across ${videoRef} and it honestly stood out.`);

    if (topSound) {
      lines.push(
        `The energy you bring when you use ${soundRef} matches exactly what we're going for with Ebril's new drop.`
      );
    } else {
      lines.push(`Your content vibe matches exactly what we're building with Ebril's new drop.`);
    }

    lines.push('');
    lines.push(
      `Would you be open to making one video with his sound? No rigid brief — just what feels natural for your audience. We'd cover [rate] and I can send you the track early.`
    );
    lines.push('');
    lines.push(`Let me know if you want more details or the link to the sound!`);

    if (entries.length === 0) {
      return [
        `[TEMPLATE — customize after reviewing @${handle}'s content]`,
        '',
        ...lines,
        '',
        `[Suggested personalization once you've reviewed their posts:]`,
        `- Reference their most-viewed video or a recurring content format`,
        `- Mention a specific hashtag they use if it aligns with Ebril's brand`,
        `- If they post at a consistent time, send the DM 1hr before that window`,
      ].join('\n');
    }

    return lines.join('\n');
  }

  // ── Sound report ──────────────────────────────────────────────────────────

  /**
   * Analyze all content in the library that uses a specific sound.
   * Useful for: "what formats work for 'Different'?"
   */
  buildSoundReport(soundTitle) {
    const entries = this.library.getSoundEntries(soundTitle);

    const byType     = countBy(entries, 'contentType');
    const byPlatform = countBy(entries, 'platform');
    const creators   = [...new Set(entries.map((e) => e.creator).filter(Boolean))];

    const allHashtags = entries
      .flatMap((e) => ContentLibrary.extractHashtags(e.caption || ''))
      .reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {});
    const topHashtags = Object.entries(allHashtags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([h, n]) => `${h} (${n})`);

    const postingHours = this._analyzePostingTimes(entries);

    return {
      soundTitle,
      entryCount:      entries.length,
      uniqueCreators:  creators.length,
      contentTypes:    byType,
      platforms:       byPlatform,
      topHashtags,
      peakPostingHours: postingHours,
      creators,
      generatedAt:     new Date().toISOString(),
    };
  }

  // ── Campaign deck ──────────────────────────────────────────────────────────

  /**
   * Build a campaign portfolio report — all content for a tag.
   * Used after a campaign to document what was created.
   */
  async buildReport({ tag } = {}) {
    const entries = tag
      ? this.library.getTagEntries(tag)
      : this.library.loadIndex().entries;

    const creators   = [...new Set(entries.map((e) => e.creator).filter(Boolean))];
    const sounds     = [...new Set(entries.map((e) => e.sound).filter(Boolean))];
    const byPlatform = countBy(entries, 'platform');
    const byType     = countBy(entries, 'contentType');
    const totalBytes = entries.reduce((sum, e) => sum + (e.bytes || 0), 0);

    const lines = [
      `# Content Library Report${tag ? `: ${tag}` : ''}`,
      `_Generated ${new Date().toLocaleString()}_`,
      '',
      '## Summary',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total assets | ${entries.length} |`,
      `| Unique creators | ${creators.length} |`,
      `| Sounds tracked | ${sounds.join(', ') || '—'} |`,
      `| Total size | ${(totalBytes / 1024 / 1024).toFixed(1)} MB |`,
      '',
      '### By Platform',
      ...Object.entries(byPlatform).map(([p, n]) => `- **${p}**: ${n}`),
      '',
      '### By Content Type',
      ...Object.entries(byType).map(([t, n]) => `- **${t || 'unknown'}**: ${n}`),
    ];

    if (sounds.length > 0) {
      lines.push('', '## Sound Analysis');
      for (const s of sounds) {
        const report = this.buildSoundReport(s);
        lines.push(
          '', `### "${s}"`,
          `${report.entryCount} example(s) from ${report.uniqueCreators} creator(s)`,
          '',
          `**Top content types:** ${Object.entries(report.contentTypes).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}`,
          `**Top hashtags:** ${report.topHashtags.slice(0, 5).join(', ') || '—'}`,
          `**Peak posting hours:** ${report.peakPostingHours.slice(0, 3).join('h, ')}h`,
        );
      }
    }

    if (creators.length > 0) {
      lines.push('', '## Creators', '');
      for (const creator of creators) {
        const ces   = entries.filter((e) => e.creator === creator);
        const sound = ces[0]?.sound || '—';
        const note  = ces[0]?.note  || '';
        lines.push(
          `### @${creator}`,
          `- Platform: ${ces[0]?.platform || '—'}`,
          `- Downloads: ${ces.length}`,
          `- Sound: ${sound}`,
          `- Tag: ${ces[0]?.tag || '—'}`,
          note ? `- Note: ${note}` : '',
          '',
        );
      }
    }

    lines.push('', '---', `_Florra Creator Research — ${new Date().getFullYear()}_`);
    return lines.filter((l) => l !== undefined).join('\n');
  }

  // ── Markdown renderer ──────────────────────────────────────────────────────

  renderMarkdown(brief) {
    const lines = [
      `# Creator Brief: @${brief.handle}`,
      `_Generated ${new Date(brief.generatedAt).toLocaleString()}_`,
      '',
    ];

    if (brief.profileUrl) {
      lines.push(`**Profile:** ${brief.profileUrl}`, '');
    }

    lines.push(
      '## Overview',
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Downloads in library | ${brief.entryCount} |`,
      `| Sounds tracked | ${brief.sounds.join(', ') || '—'} |`,
      `| Platforms | ${Object.keys(brief.platforms).join(', ') || '—'} |`,
      `| Content types | ${Object.entries(brief.contentTypes).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'} |`,
      `| Peak posting | ${brief.postingHours.slice(0, 2).join('h, ')}h |`,
      `| Top hashtags | ${brief.topHashtags.slice(0, 5).join(', ') || '—'} |`,
      '',
    );

    if (brief.files.length > 0) {
      lines.push(
        '## Content Library',
        '',
        ...brief.files.map((f) => `- \`${f}\``),
        '',
      );
    }

    if (brief.captions.length > 0) {
      lines.push(
        '## Captions',
        '',
        ...brief.captions.slice(0, 5).map((c) => `> ${c}`),
        '',
      );
    }

    if (brief.entryCount === 0) {
      lines.push(
        '## Research Checklist',
        '',
        `_No content downloaded yet. To build this brief:_`,
        '',
        `1. Visit: ${brief.profileUrl || `https://www.tiktok.com/@${brief.handle}`}`,
        `2. Find their best 2–3 posts that use the sound`,
        `3. Add each URL: \`npm run cobalt:add -- --url <url> --creator ${brief.handle}\``,
        `4. Process the queue: \`npm run cobalt:process\``,
        `5. Regenerate this brief`,
        '',
      );
    }

    lines.push(
      '## DM Script',
      '',
      '```',
      brief.dmScript,
      '```',
      '',
      '---',
      `_Florra Creator Research_`,
    );

    return lines.join('\n');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _guessProfileUrl(entries) {
    if (entries.length === 0) return null;
    const e = entries[0];
    if (!e.creator || !e.platform) return null;
    if (e.platform === 'tiktok')    return `https://www.tiktok.com/@${e.creator}`;
    if (e.platform === 'instagram') return `https://www.instagram.com/${e.creator}/`;
    if (e.platform === 'youtube')   return `https://www.youtube.com/@${e.creator}`;
    return null;
  }

  _analyzePostingTimes(entries) {
    const hours = {};
    for (const e of entries) {
      if (!e.postedAt) continue;
      const h = new Date(e.postedAt).getUTCHours();
      hours[h] = (hours[h] || 0) + 1;
    }
    return Object.entries(hours)
      .sort((a, b) => b[1] - a[1])
      .map(([h]) => parseInt(h, 10));
  }
}

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

module.exports = BriefGenerator;
