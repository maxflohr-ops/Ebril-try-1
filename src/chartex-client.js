/**
 * chartex-client.js
 * REST client for the Chartex API (https://chartex.com)
 *
 * Chartex tracks song velocity and usage across TikTok, Spotify, YouTube,
 * Apple Music, and Shazam. It surfaces which creators are driving a sound
 * and flags rising artists before the mainstream catches on.
 *
 * Set CHARTEX_API_KEY and CHARTEX_ARTIST_ID in your .env file.
 */

const https = require('https');
const BASE_URL = 'https://api.chartex.com/v1';

class ChartexClient {
  constructor(apiKey) {
    if (!apiKey) throw new Error('CHARTEX_API_KEY is required');
    this.apiKey = apiKey;
  }

  /** Low-level GET helper */
  _get(path, params = {}) {
    return new Promise((resolve, reject) => {
      const query = new URLSearchParams(params).toString();
      const url = `${BASE_URL}${path}${query ? '?' + query : ''}`;
      const options = {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`Chartex API error ${res.statusCode}: ${data}`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse Chartex response: ${data}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Fetch all tracks in an artist's catalog.
   * Returns: [{ id, title, isrc, releaseDate, platforms: { tiktok, spotify, youtube } }]
   */
  getArtistTracks(artistId) {
    return this._get(`/artists/${artistId}/tracks`);
  }

  /**
   * Fetch usage stats for a specific track.
   * Returns: {
   *   trackId, title,
   *   tiktok:   { soundUses, weeklyVelocity, trend },
   *   spotify:  { streams, monthlyVelocity, trend },
   *   youtube:  { views, weeklyVelocity, trend },
   *   shazam:   { searches, trend },
   *   appleMusic: { plays, trend },
   *   lastUpdated
   * }
   */
  getTrackUsage(trackId) {
    return this._get(`/tracks/${trackId}/usage`);
  }

  /**
   * Fetch creators (TikTok / UGC) actively using a track as a sound.
   * params: { limit=50, offset=0, sortBy='velocity' }
   * Returns: [{
   *   creatorId, username, platform, followers, avgViews,
   *   postCount, firstUsed, latestPost, country, influenceScore
   * }]
   */
  getTrackCreators(trackId, params = {}) {
    return this._get(`/tracks/${trackId}/creators`, { limit: 50, ...params });
  }

  /**
   * Discover rising sounds across all platforms.
   * params: { genre, country, platform, excludeMajorLabels=true, limit=20 }
   * Returns: [{
   *   trackId, title, artistName, label, isIndependent,
   *   velocityScore, weeklyGrowthPct, platforms, topCreator
   * }]
   */
  getRisingSounds(params = {}) {
    return this._get('/trending/sounds', { excludeMajorLabels: true, limit: 20, ...params });
  }

  /**
   * Discover rising creators across platforms.
   * params: { platform, country, genre, limit=20 }
   * Returns: [{
   *   creatorId, username, platform, followers, weeklyFollowerGrowth,
   *   avgEngagementRate, topSound, country, genre
   * }]
   */
  getRisingCreators(params = {}) {
    return this._get('/trending/creators', { limit: 20, ...params });
  }

  /**
   * Convenience: fetch full snapshot for Ebril's catalog.
   * Returns combined song usage + top creators for every track.
   */
  async getEbrilSnapshot(artistId) {
    const { tracks } = await this.getArtistTracks(artistId);

    const snapshots = await Promise.all(
      tracks.map(async (track) => {
        const [usage, creators] = await Promise.all([
          this.getTrackUsage(track.id),
          this.getTrackCreators(track.id, { limit: 10 }),
        ]);
        return { track, usage, creators: creators.items || [] };
      })
    );

    return snapshots;
  }
}

module.exports = ChartexClient;
