// Configuration + tiny .env loader (no dependencies).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// node:sqlite works fine for our purposes but emits an experimental warning on
// every run; drop just that one so CLI and server output stay readable.
const defaultWarningHandlers = process.listeners('warning');
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning' && /SQLite/i.test(warning.message)) return;
  for (const handler of defaultWarningHandlers) handler(warning);
});

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, '.env'));

export const config = {
  // TikTok "Login Kit / Display API" app credentials.
  // https://developers.tiktok.com/apps -> your app -> Basic information
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  // Must exactly match a Redirect URI registered on the TikTok app.
  redirectUri:
    process.env.TIKTOK_REDIRECT_URI || 'http://localhost:8787/oauth/callback',

  // Scopes requested from each fan page when they connect.
  // user.info.stats is what unlocks follower_count / likes_count.
  scopes: (
    process.env.TIKTOK_SCOPES ||
    'user.info.basic,user.info.profile,user.info.stats,video.list'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Optional: Research API (client-credentials) for pages that have not
  // authorized you. Requires separate TikTok approval.
  researchEnabled: process.env.TIKTOK_RESEARCH_ENABLED === 'true',

  port: Number(process.env.PORT || 8787),
  dbPath: process.env.DB_PATH || join(ROOT, 'data', 'tracker.db'),

  // How many recent videos to pull per page on each sync.
  syncVideoLimit: Number(process.env.SYNC_VIDEO_LIMIT || 60),
};

export function assertCredentials() {
  const missing = [];
  if (!config.clientKey) missing.push('TIKTOK_CLIENT_KEY');
  if (!config.clientSecret) missing.push('TIKTOK_CLIENT_SECRET');
  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(' and ')}. Copy .env.example to .env and fill in ` +
        `your TikTok app credentials (https://developers.tiktok.com/apps).`
    );
  }
}
