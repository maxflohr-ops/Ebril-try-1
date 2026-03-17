/**
 * content-library.js
 * Manages the local archive of downloaded creator content.
 *
 * File layout:
 *   content-library/
 *     index.json                    — master record of every ingested asset
 *     queue.json                    — download queue (managed by cobalt-client.js)
 *     tiktok/
 *       slowsundayvibe/
 *         slowsundayvibe_Different_1735000000000.mp4
 *         slowsundayvibe_Different_1735000000000.json  ← metadata sidecar
 *     instagram/
 *       botanicaldiary/
 *         ...
 *
 * The sidecar JSON captures: source URL, sound, tag, post timing, engagement
 * snapshot at download time, and any notes. This makes the library queryable
 * even without loading all the video files.
 */

const fs   = require('fs');
const path = require('path');

class ContentLibrary {
  constructor(root) {
    this.root      = root;
    this.indexPath = path.join(root, 'index.json');
    this._index    = null;
  }

  // ── Index ──────────────────────────────────────────────────────────────────

  loadIndex() {
    if (this._index) return this._index;
    if (!fs.existsSync(this.indexPath)) {
      this._index = { version: 1, entries: [] };
      return this._index;
    }
    try {
      this._index = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
    } catch {
      this._index = { version: 1, entries: [] };
    }
    return this._index;
  }

  saveIndex() {
    fs.mkdirSync(this.root, { recursive: true });
    fs.writeFileSync(this.indexPath, JSON.stringify(this._index, null, 2));
  }

  /**
   * Register a downloaded asset in the library index.
   * Also writes a JSON sidecar next to the media file.
   */
  addEntry(meta) {
    const idx = this.loadIndex();
    const id  = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const entry = {
      id,
      sourceUrl:    meta.sourceUrl,
      filePath:     meta.filePath,
      filename:     meta.filename,
      bytes:        meta.bytes || 0,
      durationMs:   meta.durationMs || 0,
      platform:     meta.platform,
      creator:      meta.creator,
      sound:        meta.sound       || null,
      soundId:      meta.soundId     || null,
      tag:          meta.tag         || null,
      mode:         meta.mode        || 'auto',
      note:         meta.note        || null,
      airtableId:   meta.airtableId  || null,
      downloadedAt: meta.downloadedAt || new Date().toISOString(),
      // Engagement snapshot fields — fill these in if you know them
      followers:    meta.followers   || null,
      avgViews:     meta.avgViews    || null,
      postLikes:    meta.postLikes   || null,
      postShares:   meta.postShares  || null,
      caption:      meta.caption     || null,
      hashtags:     meta.hashtags    || null,
      postedAt:     meta.postedAt    || null,
      // Analysis fields — populated by BriefGenerator
      contentType:  meta.contentType || null,   // 'aesthetic' | 'pov' | 'tutorial' | 'dance' | 'narrative' | 'product'
      soundPlacement: meta.soundPlacement || null,  // 'opening' | 'build' | 'drop' | 'background'
    };

    idx.entries.push(entry);
    this._index = idx;
    this.saveIndex();

    // Write sidecar JSON
    if (meta.filePath) {
      const sidecarPath = meta.filePath.replace(/\.[^.]+$/, '.json');
      fs.writeFileSync(sidecarPath, JSON.stringify(entry, null, 2));
    }

    return entry;
  }

  /**
   * Update an existing entry (e.g., to add analysis results after download).
   */
  updateEntry(id, patch) {
    const idx   = this.loadIndex();
    const entry = idx.entries.find((e) => e.id === id);
    if (!entry) return null;
    Object.assign(entry, patch);
    this.saveIndex();

    // Refresh sidecar
    if (entry.filePath) {
      const sidecarPath = entry.filePath.replace(/\.[^.]+$/, '.json');
      fs.writeFileSync(sidecarPath, JSON.stringify(entry, null, 2));
    }
    return entry;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /** All entries for a creator (normalized handle). */
  getCreatorEntries(handle) {
    const h = (handle || '').toLowerCase().replace(/^@/, '');
    return this.loadIndex().entries.filter((e) => e.creator === h);
  }

  /** All entries that use a specific sound. */
  getSoundEntries(soundTitle) {
    const s = (soundTitle || '').toLowerCase();
    return this.loadIndex().entries.filter(
      (e) => e.sound && e.sound.toLowerCase() === s
    );
  }

  /** All entries matching a tag. */
  getTagEntries(tag) {
    return this.loadIndex().entries.filter((e) => e.tag === tag);
  }

  /** Most recently downloaded entries, optionally filtered by platform. */
  getRecentEntries(limit = 10, platform = null) {
    let entries = [...this.loadIndex().entries];
    if (platform) entries = entries.filter((e) => e.platform === platform);
    return entries
      .sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt))
      .slice(0, limit);
  }

  // ── File paths ─────────────────────────────────────────────────────────────

  /**
   * Compute where a file should be saved.
   * Pattern: {root}/{platform}/{creator}/{filename}.{ext}
   */
  resolveDestPath(entry, filename) {
    const platform = (entry.platform || 'unknown').toLowerCase();
    const creator  = (entry.creator  || 'unknown').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const ext      = entry.mode === 'audio' ? 'mp3' : 'mp4';
    const safeName = filename.replace(/[^a-z0-9._-]/gi, '_');
    return path.join(this.root, platform, creator, `${safeName}.${ext}`);
  }

  // ── Aggregate stats ────────────────────────────────────────────────────────

  stats() {
    const entries = this.loadIndex().entries;
    const byPlatform = {};
    const byTag      = {};
    const creators   = new Set();
    const sounds     = new Set();
    let totalBytes   = 0;

    for (const e of entries) {
      byPlatform[e.platform] = (byPlatform[e.platform] || 0) + 1;
      if (e.tag) byTag[e.tag] = (byTag[e.tag] || 0) + 1;
      if (e.creator) creators.add(e.creator);
      if (e.sound)   sounds.add(e.sound.toLowerCase());
      totalBytes += e.bytes || 0;
    }

    return {
      totalFiles:  entries.length,
      totalBytes,
      creators:    creators.size,
      sounds:      sounds.size,
      byPlatform,
      byTag,
    };
  }

  // ── Caption / hashtag helpers ──────────────────────────────────────────────

  /** Extract hashtags from a caption string. */
  static extractHashtags(caption = '') {
    return (caption.match(/#[\w]+/g) || []).map((h) => h.toLowerCase());
  }

  /**
   * Naively classify content type from a caption.
   * Used by BriefGenerator to tag entries when captions are known.
   */
  static inferContentType(caption = '') {
    const lc = caption.toLowerCase();
    if (lc.includes('pov'))                         return 'pov';
    if (lc.includes('tutorial') || lc.includes('how to')) return 'tutorial';
    if (lc.includes('dance') || lc.includes('choreo'))    return 'dance';
    if (lc.includes('routine') || lc.includes('workout')) return 'fitness';
    if (lc.includes('aesthetic') || lc.includes('vibe'))  return 'aesthetic';
    if (lc.includes('review') || lc.includes('honest'))   return 'review';
    return 'general';
  }

  /**
   * Detect where the sound likely lands in the video structure from caption clues.
   */
  static inferSoundPlacement(caption = '') {
    const lc = caption.toLowerCase();
    if (lc.includes('drop') || lc.includes('when the beat')) return 'drop';
    if (lc.includes('transition'))                            return 'transition';
    if (lc.includes('background') || lc.includes('ambience')) return 'background';
    return 'unknown';
  }
}

module.exports = ContentLibrary;
