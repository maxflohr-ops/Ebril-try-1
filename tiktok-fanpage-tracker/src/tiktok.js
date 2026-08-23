// TikTok API client (Display API v2 + optional Research API).
//
// Docs:
//   OAuth       https://developers.tiktok.com/doc/oauth-user-access-token-management
//   User info   https://developers.tiktok.com/doc/display-api-get-user-info
//   Video list  https://developers.tiktok.com/doc/display-api-get-video-list
//   Research    https://developers.tiktok.com/doc/research-api-specs-query-videos
import { randomBytes } from 'node:crypto';
import { config, assertCredentials } from './config.js';

const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const API = 'https://open.tiktokapis.com/v2';

export const USER_FIELDS = [
  'open_id',
  'union_id',
  'avatar_url',
  'display_name',
  'profile_deep_link',
  'follower_count',
  'following_count',
  'likes_count',
  'video_count',
];

export const VIDEO_FIELDS = [
  'id',
  'create_time',
  'title',
  'video_description',
  'duration',
  'cover_image_url',
  'share_url',
  'view_count',
  'like_count',
  'comment_count',
  'share_count',
];

export class TikTokApiError extends Error {
  constructor(message, { status, code, logId } = {}) {
    super(message);
    this.name = 'TikTokApiError';
    this.status = status;
    this.code = code;
    this.logId = logId;
  }
  /** Token problems mean "reconnect this page", not "retry later". */
  get isAuthError() {
    return (
      this.status === 401 ||
      ['access_token_invalid', 'scope_not_authorized', 'invalid_grant'].includes(this.code)
    );
  }
}

/* ------------------------------- helpers ------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Single request with retry on 429/5xx (exponential backoff, jittered).
 */
async function request(url, options = {}, attempt = 0) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  const retryable = res.status === 429 || res.status >= 500;
  if (retryable && attempt < 4) {
    const retryAfter = Number(res.headers.get('retry-after')) * 1000;
    const backoff = retryAfter || 2 ** attempt * 1000 + Math.floor(Math.random() * 400);
    await sleep(backoff);
    return request(url, options, attempt + 1);
  }

  // OAuth endpoints report failure with an `error` string; data endpoints use
  // an `error` object whose code is "ok" on success.
  const err = body.error;
  const failed =
    !res.ok ||
    (typeof err === 'string' && err) ||
    (err && typeof err === 'object' && err.code && err.code !== 'ok');

  if (failed) {
    const code = typeof err === 'string' ? err : err?.code;
    const message =
      (typeof err === 'string' ? body.error_description : err?.message) ||
      `${res.status} ${res.statusText}`;
    throw new TikTokApiError(message, {
      status: res.status,
      code,
      logId: err?.log_id || body.log_id,
    });
  }
  return body;
}

/* -------------------------------- OAuth ------------------------------- */

/** URL a fan page owner opens to authorize you. `state` guards against CSRF. */
export function buildAuthorizeUrl(state = randomBytes(16).toString('hex')) {
  assertCredentials();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_key', config.clientKey);
  url.searchParams.set('scope', config.scopes.join(','));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  return { url: url.toString(), state };
}

function tokenExpiry(seconds) {
  return new Date(Date.now() + Number(seconds || 0) * 1000).toISOString();
}

async function tokenRequest(params) {
  assertCredentials();
  const body = new URLSearchParams({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    ...params,
  });
  const data = await request(`${API}/oauth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body,
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    openId: data.open_id,
    scope: data.scope,
    tokenExpiresAt: tokenExpiry(data.expires_in),
    refreshExpiresAt: tokenExpiry(data.refresh_expires_in),
  };
}

export function exchangeCodeForToken(code) {
  return tokenRequest({
    code: decodeURIComponent(code),
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  });
}

export function refreshAccessToken(refreshToken) {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

export function revokeAccessToken(accessToken) {
  assertCredentials();
  return request(`${API}/oauth/revoke/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      token: accessToken,
    }),
  });
}

/* ----------------------------- Display API ---------------------------- */

export async function fetchUserInfo(accessToken, fields = USER_FIELDS) {
  const url = `${API}/user/info/?fields=${encodeURIComponent(fields.join(','))}`;
  const body = await request(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return body.data?.user ?? {};
}

/**
 * Pull up to `limit` of the page's most recent videos, following cursors.
 * TikTok caps max_count at 20 per call.
 */
export async function fetchVideos(accessToken, { limit = 60, fields = VIDEO_FIELDS } = {}) {
  const url = `${API}/video/list/?fields=${encodeURIComponent(fields.join(','))}`;
  const videos = [];
  let cursor;
  let hasMore = true;

  while (hasMore && videos.length < limit) {
    const payload = { max_count: Math.min(20, limit - videos.length) };
    if (cursor !== undefined) payload.cursor = cursor;

    const body = await request(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const batch = body.data?.videos ?? [];
    videos.push(...batch);
    hasMore = Boolean(body.data?.has_more) && batch.length > 0;
    cursor = body.data?.cursor;
  }
  return videos.slice(0, limit);
}

/* ---------------------------- Research API ---------------------------- */
// Fallback for pages that have not authorized you. Requires a separate,
// approved TikTok Research API application; without it these calls 401.

let researchToken = { value: null, expiresAt: 0 };

async function getResearchToken() {
  if (researchToken.value && Date.now() < researchToken.expiresAt - 60_000) {
    return researchToken.value;
  }
  assertCredentials();
  const data = await request(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
    }),
  });
  researchToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 0) * 1000,
  };
  return researchToken.value;
}

/** Query a public username's recent videos via the Research API. */
export async function researchVideosByUsername(username, { since, until, limit = 100 } = {}) {
  if (!config.researchEnabled) {
    throw new TikTokApiError('Research API is not enabled (set TIKTOK_RESEARCH_ENABLED=true)', {
      code: 'research_disabled',
    });
  }
  const token = await getResearchToken();
  const fields = [
    'id',
    'username',
    'create_time',
    'video_description',
    'view_count',
    'like_count',
    'comment_count',
    'share_count',
  ];
  const yyyymmdd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const end = until ? new Date(until) : new Date();
  const start = since ? new Date(since) : new Date(end.getTime() - 30 * 864e5);

  const body = await request(
    `${API}/research/video/query/?fields=${encodeURIComponent(fields.join(','))}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          and: [
            {
              operation: 'EQ',
              field_name: 'username',
              field_values: [String(username).replace(/^@/, '')],
            },
          ],
        },
        start_date: yyyymmdd(start),
        end_date: yyyymmdd(end),
        max_count: Math.min(100, limit),
      }),
    }
  );
  return body.data?.videos ?? [];
}
