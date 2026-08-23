#!/usr/bin/env node
// CLI for the TikTok fanpage tracker.
import { config } from '../src/config.js';
import {
  getDb,
  closeDb,
  listPages,
  getPageByHandle,
  upsertPage,
  deletePage,
  createOauthState,
  nowIso,
} from '../src/db.js';
import { buildReport } from '../src/report.js';
import { syncAll, syncPage } from '../src/sync.js';
import { buildAuthorizeUrl } from '../src/tiktok.js';
import { seedDemoData, clearDemoData } from '../src/demo.js';
import { startServer } from '../src/server.js';
import { fmtCompact } from '../src/metrics.js';
import { randomBytes } from 'node:crypto';

const [, , command = 'help', ...args] = process.argv;

const flag = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const next = args[idx + 1];
  return next && !next.startsWith('--') ? next : true;
};

const pad = (s, width, right = false) => {
  const str = String(s);
  const clipped = str.length > width ? str.slice(0, width - 1) + '…' : str;
  return right ? clipped.padStart(width) : clipped.padEnd(width);
};

const GRADE_COLOR = { A: 32, B: 36, C: 33, D: 33, F: 31 };
const color = (text, code) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : String(text));

function printReport(windowDays) {
  const { summary, pages } = buildReport({ windowDays, includeDropped: false });

  console.log(`\n  Fanpage roster — last ${windowDays} days\n`);
  if (!pages.length) {
    console.log('  No pages tracked yet. Add one with:\n');
    console.log('    node bin/tracker.js add @theirhandle --quota 5\n');
    return;
  }

  const header =
    '  ' +
    pad('PAGE', 22) +
    pad('SCORE', 7, true) +
    pad('FOLLOWERS', 11, true) +
    pad('POSTS', 7, true) +
    pad('VIEWS', 10, true) +
    pad('MEDIAN', 9, true) +
    pad('ENG', 7, true) +
    pad('SHARE', 7, true) +
    pad('TREND', 8, true) +
    '  SIGNALS';
  console.log(color(header, 90));
  console.log(color('  ' + '─'.repeat(header.length + 12), 90));

  for (const p of pages) {
    const grade = color(p.grade, GRADE_COLOR[p.grade] || 0);
    const trend = p.posts ? `${p.trend > 0 ? '+' : ''}${Math.round(p.trend * 100)}%` : '—';
    const topFlag = p.flags[0];
    const signal = topFlag
      ? color(topFlag.label, topFlag.level === 'error' ? 31 : topFlag.level === 'warn' ? 33 : 32)
      : color('—', 90);

    console.log(
      '  ' +
        pad('@' + p.handle, 22) +
        pad(`${p.score} ${grade}`, 7 + (process.stdout.isTTY ? 9 : 0), true) +
        pad(fmtCompact(p.followers), 11, true) +
        pad(`${p.posts}`, 7, true) +
        pad(fmtCompact(p.totalViews), 10, true) +
        pad(fmtCompact(p.medianViews), 9, true) +
        pad((p.engagementRate * 100).toFixed(1) + '%', 7, true) +
        pad((p.shareRate * 100).toFixed(2) + '%', 7, true) +
        pad(trend, 8, true) +
        '  ' +
        signal
    );
  }

  console.log(
    `\n  ${fmtCompact(summary.totalViews)} views · ${fmtCompact(summary.totalEngagements)} engagements · ` +
      `${(summary.avgEngagementRate * 100).toFixed(1)}% avg engagement · ${summary.totalPosts} posts`
  );
  console.log(
    `  ${summary.activePages} active pages · ${fmtCompact(summary.totalFollowers)} combined followers ` +
      `(${summary.followerDelta >= 0 ? '+' : ''}${fmtCompact(summary.followerDelta)})`
  );
  if (summary.needsAttention) {
    console.log(color(`  ${summary.needsAttention} page(s) need attention:`, 33));
    for (const p of pages) {
      for (const f of p.flags.filter((x) => x.level === 'error')) {
        console.log(color(`    @${p.handle}: ${f.label} — ${f.detail}`, 31));
      }
    }
  }
  console.log();
}

const HELP = `
  TikTok fanpage tracker

  Usage: node bin/tracker.js <command> [options]

    serve [--port N]          Start the dashboard (default http://localhost:${config.port})
    sync                      Pull fresh numbers for every tracked page
    sync <@handle>            Sync a single page
    report [--window 30]      Print the roster scorecard in the terminal
    add <@handle> [--quota N] [--note "..."]
                              Track a new page (then send them the connect link)
    connect <@handle>         Print the authorization link to send that page's owner
    list                      List tracked pages and their connection state
    remove <@handle>          Delete a page and its stored history
    demo [--clear]            Seed (or clear) realistic sample data
    help                      This message
`;

async function main() {
  getDb();

  switch (command) {
    case 'serve': {
      await startServer({ port: Number(flag('port', config.port)) });
      return; // keep the process alive
    }

    case 'sync': {
      const handle = args.find((a) => !a.startsWith('--'));
      if (handle) {
        const page = getPageByHandle(handle);
        if (!page) throw new Error(`No tracked page named @${handle.replace(/^@/, '')}`);
        const result = await syncPage(page.id);
        console.log(result.ok ? `  ✓ @${page.handle}: ${result.videos} videos` : `  ✗ @${page.handle}: ${result.error}`);
      } else {
        const results = await syncAll({
          onProgress: (r, done, total) =>
            console.log(
              `  [${done}/${total}] ${r.ok ? '✓' : '✗'} @${r.handle} ${r.ok ? `${r.videos} videos` : r.error}`
            ),
        });
        const failed = results.filter((r) => !r.ok).length;
        console.log(`\n  Synced ${results.length - failed}/${results.length} pages.`);
      }
      break;
    }

    case 'report':
      printReport(Number(flag('window', 30)));
      break;

    case 'add': {
      const raw = args.find((a) => !a.startsWith('--'));
      if (!raw) throw new Error('Usage: add <@handle> [--quota N] [--note "..."]');
      const handle = raw.replace(/^@/, '');
      if (getPageByHandle(handle)) throw new Error(`@${handle} is already tracked`);
      const id = `pending_${handle.toLowerCase()}`;
      upsertPage({
        id,
        handle,
        display_name: handle,
        expected_posts_per_week: Number(flag('quota', 5)),
        notes: typeof flag('note') === 'string' ? flag('note') : null,
        joined_at: nowIso(),
      });
      console.log(`  Added @${handle}.`);
      console.log(`  Send them this link so their numbers start flowing:\n`);
      console.log(`    ${config.redirectUri.replace('/oauth/callback', '')}/connect?handle=${handle}\n`);
      break;
    }

    case 'connect': {
      const raw = args.find((a) => !a.startsWith('--'));
      if (!raw) throw new Error('Usage: connect <@handle>');
      const handle = raw.replace(/^@/, '');
      const { url, state } = buildAuthorizeUrl(randomBytes(16).toString('hex'));
      createOauthState(state, handle);
      console.log(`\n  Send this to @${handle} (single use, expires in 1 hour):\n\n  ${url}\n`);
      console.log(`  Your server must be running so TikTok can reach ${config.redirectUri}\n`);
      break;
    }

    case 'list': {
      const pages = listPages();
      if (!pages.length) return console.log('  No pages tracked yet.');
      console.log();
      for (const p of pages) {
        const connected = p.access_token ? color('connected', 32) : color('not connected', 33);
        const synced = p.last_sync_at ? p.last_sync_at.slice(0, 10) : 'never';
        console.log(
          `  ${pad('@' + p.handle, 24)} ${pad(p.status, 9)} ${pad(connected, 22)} synced ${synced}` +
            (p.last_sync_error ? color(`  (${p.last_sync_error})`, 31) : '')
        );
      }
      console.log();
      break;
    }

    case 'remove': {
      const raw = args.find((a) => !a.startsWith('--'));
      if (!raw) throw new Error('Usage: remove <@handle>');
      const page = getPageByHandle(raw);
      if (!page) throw new Error(`No tracked page named ${raw}`);
      deletePage(page.id);
      console.log(`  Removed @${page.handle}.`);
      break;
    }

    case 'demo': {
      if (flag('clear')) {
        clearDemoData();
        console.log('  Demo data cleared.');
      } else {
        const count = seedDemoData();
        console.log(`  Seeded ${count} demo fan pages. Run \`node bin/tracker.js serve\` to view.`);
      }
      break;
    }

    default:
      console.log(HELP);
  }

  closeDb();
}

main().catch((err) => {
  console.error(`\n  Error: ${err.message}\n`);
  process.exitCode = 1;
});
