/* Fanpage Tracker dashboard — no build step, no framework. */

const state = {
  windowDays: 30,
  report: null,
  sort: { key: 'score', dir: 'desc' },
  filter: '',
  showInactive: false,
  openPageId: null,
};

const $ = (sel) => document.querySelector(sel);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/* ------------------------------ formatting ---------------------------- */

const compact = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(v));
};
const pct = (x, digits = 1) => (Number(x) * 100).toFixed(digits) + '%';
const signed = (n) => (n > 0 ? '+' : '') + compact(n);
const dirClass = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : 'neutral');

function relativeDay(iso) {
  if (!iso) return '—';
  const days = (Date.now() - new Date(iso)) / 86400000;
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  return Math.round(days) + 'd ago';
}

/* -------------------------------- api --------------------------------- */

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

let toastTimer;
function toast(message, isError = false) {
  const node = $('#toast');
  node.textContent = message;
  node.className = 'toast' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.add('hidden'), 4200);
}

/* ------------------------------- charts ------------------------------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

function lineChart(points, { width = 600, height = 110, color = '#25f4ee' } = {}) {
  const svg = svgEl('svg', {
    class: 'chart',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'none',
  });
  if (points.length < 2) return svg;

  const pad = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i) => (i / (points.length - 1)) * width;
  const y = (v) => height - pad - ((v - min) / span) * (height - pad * 2);
  const path = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const gradId = 'g' + Math.random().toString(36).slice(2, 8);
  const defs = svgEl('defs', {});
  const grad = svgEl('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.append(
    svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.28' }),
    svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' })
  );
  defs.append(grad);
  svg.append(
    defs,
    svgEl('path', { d: `${path} L${width},${height} L0,${height} Z`, fill: `url(#${gradId})` }),
    svgEl('path', { d: path, fill: 'none', stroke: color, 'stroke-width': '2', 'vector-effect': 'non-scaling-stroke' })
  );
  return svg;
}

function barChart(values, { width = 600, height = 110, color = '#fe2c55' } = {}) {
  const svg = svgEl('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' });
  const max = Math.max(...values, 1);
  const slot = width / Math.max(values.length, 1);
  const barW = Math.max(1, slot * 0.62);
  values.forEach((v, i) => {
    const h = (v / max) * (height - 8);
    svg.append(
      svgEl('rect', {
        x: (i * slot + (slot - barW) / 2).toFixed(2),
        y: (height - h).toFixed(2),
        width: barW.toFixed(2),
        height: Math.max(v > 0 ? 1.5 : 0, h).toFixed(2),
        rx: Math.min(2, barW / 2),
        fill: v > 0 ? color : '#262633',
        opacity: v > 0 ? 0.85 : 1,
      })
    );
  });
  return svg;
}

/* ------------------------------- summary ------------------------------ */

function renderSummary(summary) {
  const cards = [
    {
      label: 'Views',
      value: compact(summary.totalViews),
      sub: `${summary.totalPosts} posts across ${summary.activePages} active pages`,
    },
    {
      label: 'Engagements',
      value: compact(summary.totalEngagements),
      sub: `${pct(summary.avgEngagementRate)} of views engaged`,
    },
    {
      label: 'Combined reach',
      value: compact(summary.totalFollowers),
      sub: `${signed(summary.followerDelta)} followers this window`,
      cls: dirClass(summary.followerDelta),
    },
    {
      label: 'Median score',
      value: Math.round(summary.medianScore),
      sub: summary.topPerformers.length ? `Best: @${summary.topPerformers[0].handle}` : '—',
    },
    {
      label: 'Needs attention',
      value: summary.needsAttention,
      sub: summary.needsAttention ? 'pages with a red flag' : 'roster is clean',
      cls: summary.needsAttention ? 'down' : 'up',
    },
  ];

  const container = $('#summary');
  container.replaceChildren(
    ...cards.map((c) => {
      const node = el('div', 'stat');
      node.append(el('div', 'label', c.label), el('div', 'value', String(c.value)));
      node.append(el('div', 'sub ' + (c.cls || ''), c.sub));
      return node;
    })
  );
}

/* -------------------------------- table ------------------------------- */

function sortedPages() {
  const { key, dir } = state.sort;
  const term = state.filter.trim().toLowerCase();
  const rows = state.report.pages.filter((p) => {
    if (!state.showInactive && p.status !== 'active') return false;
    if (!term) return true;
    return (p.handle + ' ' + p.displayName).toLowerCase().includes(term);
  });
  return rows.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av || 0) - (bv || 0);
    return dir === 'asc' ? cmp : -cmp;
  });
}

function avatarNode(page) {
  if (page.avatarUrl) {
    const img = el('img', 'avatar');
    img.src = page.avatarUrl;
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }
  return el('div', 'avatar', (page.handle[0] || '?').toUpperCase());
}

function renderTable() {
  const tbody = $('#roster tbody');
  const rows = sortedPages();
  tbody.replaceChildren();

  const emptyNode = $('#roster-empty');
  if (!rows.length) {
    emptyNode.textContent = state.report.pages.length
      ? 'No pages match this filter.'
      : 'No pages tracked yet. Add one, or run `node bin/tracker.js demo` for sample data.';
    emptyNode.classList.remove('hidden');
  } else {
    emptyNode.classList.add('hidden');
  }

  for (const p of rows) {
    const tr = el('tr');
    if (p.status !== 'active') tr.classList.add('dimmed');
    tr.addEventListener('click', () => openDrawer(p.pageId));

    // Page
    const pageTd = el('td', 'left');
    const cell = el('div', 'page-cell');
    const text = el('div');
    text.append(el('div', 'handle', '@' + p.handle));
    text.append(
      el(
        'div',
        'page-sub',
        p.status === 'active' ? `last post ${relativeDay(p.lastPostAt)}` : p.status
      )
    );
    cell.append(avatarNode(p), text);
    pageTd.append(cell);

    // Score
    const scoreTd = el('td');
    const score = el('div', 'score');
    score.append(el('span', null, String(p.score)), el('span', 'grade ' + p.grade, p.grade));
    scoreTd.append(score);

    // Followers
    const followerTd = el('td');
    followerTd.append(el('div', null, compact(p.followers)));
    followerTd.append(
      el('div', 'delta ' + dirClass(p.followerDelta), signed(p.followerDelta))
    );

    // Posts vs quota
    const postsTd = el('td');
    postsTd.append(el('div', null, String(p.posts)));
    postsTd.append(
      el(
        'div',
        'delta neutral',
        `${p.postsPerWeek.toFixed(1)}/wk${p.expectedPostsPerWeek ? ' of ' + p.expectedPostsPerWeek : ''}`
      )
    );
    const bar = el('div', 'bar ' + (p.reliability >= 0.9 ? 'good' : p.reliability >= 0.6 ? 'warn' : 'bad'));
    bar.append(Object.assign(el('span'), { style: `width:${Math.min(100, p.reliability * 100)}%` }));
    postsTd.append(bar);

    const trendTd = el('td', dirClass(p.trend));
    trendTd.textContent = p.posts ? (p.trend > 0 ? '+' : '') + Math.round(p.trend * 100) + '%' : '—';

    const signalsTd = el('td', 'left');
    const chips = el('div', 'chips');
    for (const f of p.flags.slice(0, 3)) {
      const chip = el('span', 'chip ' + f.level, f.label);
      chip.title = f.detail;
      chips.append(chip);
    }
    if (!p.flags.length) chips.append(el('span', 'page-sub', 'nothing to flag'));
    signalsTd.append(chips);

    tr.append(
      pageTd,
      scoreTd,
      followerTd,
      postsTd,
      el('td', null, compact(p.totalViews)),
      el('td', null, compact(p.medianViews)),
      el('td', null, pct(p.engagementRate)),
      el('td', null, pct(p.shareRate, 2)),
      trendTd,
      signalsTd
    );
    tbody.append(tr);
  }
}

/* -------------------------------- drawer ------------------------------ */

async function openDrawer(pageId) {
  state.openPageId = pageId;
  const hash = '#page=' + encodeURIComponent(pageId);
  if (location.hash !== hash) history.replaceState(null, '', hash);
  const drawer = $('#drawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  $('#scrim').classList.add('open');
  $('#drawer-content').replaceChildren(el('p', 'empty', 'Loading…'));

  try {
    const detail = await api(`/api/pages/${encodeURIComponent(pageId)}?window=${state.windowDays}`);
    renderDrawer(detail);
  } catch (err) {
    $('#drawer-content').replaceChildren(el('p', 'empty', err.message));
  }
}

function closeDrawer() {
  state.openPageId = null;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('#scrim').classList.remove('open');
}

const COMPONENT_LABELS = {
  reach: 'Reach',
  engagement: 'Engagement',
  amplification: 'Shareability',
  reliability: 'Reliability',
  growth: 'Growth',
};

function renderDrawer(d) {
  const root = el('div');

  const head = el('div', 'drawer-head');
  const titleBox = el('div');
  titleBox.append(el('h2', null, '@' + d.handle));
  titleBox.append(
    el(
      'div',
      'page-sub',
      `${d.displayName} · ${compact(d.followers)} followers · score ${d.score} (${d.grade}) · top ${100 - d.percentile}% of roster`
    )
  );
  const close = el('button', 'drawer-close', '×');
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', closeDrawer);
  head.append(avatarNode(d), titleBox, close);
  root.append(head);

  if (d.flags.length) {
    const chips = el('div', 'chips');
    chips.style.marginTop = '12px';
    for (const f of d.flags) {
      const chip = el('span', 'chip ' + f.level, `${f.label} — ${f.detail}`);
      chips.append(chip);
    }
    root.append(chips);
  }

  const minis = [
    ['Views', compact(d.totalViews)],
    ['Median/post', compact(d.medianViews)],
    ['Best post', compact(d.bestViews)],
    ['Engagement', pct(d.engagementRate)],
    ['Share rate', pct(d.shareRate, 2)],
    ['Comment rate', pct(d.commentRate, 2)],
    ['Reach ratio', d.reachRatio.toFixed(2) + 'x'],
    ['Posts/week', d.postsPerWeek.toFixed(1)],
  ];
  const grid = el('div', 'subgrid');
  for (const [label, value] of minis) {
    const mini = el('div', 'mini');
    mini.append(el('div', 'label', label), el('div', 'value', value));
    grid.append(mini);
  }
  root.append(grid);

  // Score breakdown
  root.append(el('div', 'section-title', 'Score breakdown'));
  const rows = el('div', 'score-rows');
  for (const [key, label] of Object.entries(COMPONENT_LABELS)) {
    const value = d.components[key] || 0;
    const row = el('div', 'score-row');
    const bar = el('div', 'bar ' + (value >= 70 ? 'good' : value >= 45 ? 'warn' : 'bad'));
    bar.style.height = '7px';
    bar.append(Object.assign(el('span'), { style: `width:${Math.min(100, value)}%` }));
    row.append(el('div', 'name', label), bar, el('div', 'num', Math.round(value)));
    rows.append(row);
  }
  root.append(rows);

  // Charts
  if (d.followerSeries.length > 1) {
    root.append(el('div', 'section-title', 'Followers'));
    root.append(lineChart(d.followerSeries.map((s) => s.followers)));
    const labels = el('div', 'chart-label');
    labels.append(
      el('span', null, compact(d.followerSeries[0].followers)),
      el('span', dirClass(d.followerDelta), `${signed(d.followerDelta)} (${pct(d.followerGrowthPct)})`)
    );
    root.append(labels);
  }

  root.append(el('div', 'section-title', `Views by post date · last ${d.windowDays} days`));
  root.append(barChart(d.dailyViews.map((x) => x.views)));
  const viewLabels = el('div', 'chart-label');
  viewLabels.append(
    el('span', null, `${d.windowDays}d ago`),
    el('span', null, `${d.posts} posts · ${compact(d.totalViews)} views`),
    el('span', null, 'today')
  );
  root.append(viewLabels);

  // Posts
  root.append(el('div', 'section-title', 'Top posts'));
  const list = el('div');
  for (const post of d.topPosts) {
    const row = el('div', 'post');
    if (post.coverImageUrl) {
      const img = el('img', 'thumb');
      img.src = post.coverImageUrl;
      img.alt = '';
      img.loading = 'lazy';
      row.append(img);
    } else {
      row.append(el('div', 'thumb'));
    }
    const meta = el('div', 'meta');
    const cap = el('div', 'cap');
    if (post.shareUrl) {
      const link = el('a', null, post.title);
      link.href = post.shareUrl;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      cap.append(link);
    } else {
      cap.textContent = post.title;
    }
    meta.append(cap);
    meta.append(
      el(
        'div',
        'nums',
        `${compact(post.views)} views · ${compact(post.likes)} likes · ${compact(post.comments)} comments · ${compact(post.shares)} shares · ${relativeDay(post.createTime)}`
      )
    );
    row.append(meta, el('div', 'er', pct(post.engagementRate)));
    list.append(row);
  }
  if (!d.topPosts.length) list.append(el('p', 'empty', 'No posts in this window.'));
  root.append(list);

  // Partnership settings
  root.append(el('div', 'section-title', 'Partnership'));
  const fields = el('div', 'field-row');

  const quotaLabel = el('label', null, 'Posts per week agreed');
  const quotaInput = el('input');
  quotaInput.type = 'number';
  quotaInput.min = '0';
  quotaInput.step = '0.5';
  quotaInput.value = d.expectedPostsPerWeek ?? 0;
  quotaLabel.append(quotaInput);

  const statusLabel = el('label', null, 'Status');
  const statusSelect = el('select');
  for (const value of ['active', 'paused', 'dropped']) {
    const option = el('option', null, value);
    option.value = value;
    if (value === d.status) option.selected = true;
    statusSelect.append(option);
  }
  statusLabel.append(statusSelect);
  fields.append(quotaLabel, statusLabel);
  root.append(fields);

  const notesLabel = el('label', null, 'Notes');
  const notes = el('textarea');
  notes.rows = 3;
  notes.value = d.notes || '';
  notesLabel.append(notes);
  root.append(notesLabel);

  const actions = el('div', 'drawer-actions');
  const save = el('button', 'btn primary', 'Save');
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      await api(`/api/pages/${encodeURIComponent(d.pageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          expected_posts_per_week: Number(quotaInput.value),
          status: statusSelect.value,
          notes: notes.value,
        }),
      });
      toast('Saved');
      await refresh();
      openDrawer(d.pageId);
    } catch (err) {
      toast(err.message, true);
    } finally {
      save.disabled = false;
    }
  });

  const syncOne = el('button', 'btn', 'Sync this page');
  syncOne.addEventListener('click', async () => {
    syncOne.disabled = true;
    syncOne.textContent = 'Syncing…';
    try {
      const result = await api(`/api/pages/${encodeURIComponent(d.pageId)}/sync`, { method: 'POST' });
      toast(result.ok ? `Pulled ${result.videos} videos` : result.error, !result.ok);
      await refresh();
      openDrawer(d.pageId);
    } catch (err) {
      toast(err.message, true);
    } finally {
      syncOne.disabled = false;
      syncOne.textContent = 'Sync this page';
    }
  });

  const profile = el('a', 'btn', 'Open on TikTok');
  profile.href = d.profileUrl;
  profile.target = '_blank';
  profile.rel = 'noreferrer noopener';

  const connect = el('a', 'btn', d.connectedAt ? 'Re-authorize' : 'Get connect link');
  connect.href = `/connect?handle=${encodeURIComponent(d.handle)}`;
  connect.target = '_blank';
  connect.rel = 'noreferrer noopener';

  const remove = el('button', 'btn danger', 'Remove');
  remove.addEventListener('click', async () => {
    if (!confirm(`Remove @${d.handle} and all of its stored history?`)) return;
    try {
      await api(`/api/pages/${encodeURIComponent(d.pageId)}`, { method: 'DELETE' });
      closeDrawer();
      toast(`Removed @${d.handle}`);
      refresh();
    } catch (err) {
      toast(err.message, true);
    }
  });

  actions.append(save, syncOne, profile, connect, remove);
  root.append(actions);

  if (d.lastSyncAt) {
    root.append(
      el('p', 'hint', `Last synced ${relativeDay(d.lastSyncAt)} · source: ${d.source}`)
    );
  }

  $('#drawer-content').replaceChildren(root);
}

/* -------------------------------- setup ------------------------------- */

async function renderSetupBanner() {
  const banner = $('#setup-banner');
  try {
    const cfg = await api('/api/config');
    if (cfg.credentialsConfigured) return banner.classList.add('hidden');
    banner.innerHTML =
      'No TikTok API credentials yet — live syncing is off. Add <code>TIKTOK_CLIENT_KEY</code> and ' +
      '<code>TIKTOK_CLIENT_SECRET</code> to <code>.env</code>, and register ' +
      `<code>${cfg.redirectUri}</code> as a redirect URI on your TikTok app. ` +
      'Until then, run <code>node bin/tracker.js demo</code> to explore with sample data.';
    banner.classList.remove('hidden');
  } catch {
    banner.classList.add('hidden');
  }
}

/* ------------------------------- refresh ------------------------------ */

async function refresh() {
  try {
    state.report = await api(`/api/report?window=${state.windowDays}&includeDropped=true`);
    renderSummary(state.report.summary);
    renderTable();
  } catch (err) {
    toast(err.message, true);
  }
}

/* -------------------------------- events ------------------------------ */

$('#window-select').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-window]');
  if (!button) return;
  state.windowDays = Number(button.dataset.window);
  for (const b of $('#window-select').children) b.classList.toggle('active', b === button);
  refresh().then(() => state.openPageId && openDrawer(state.openPageId));
});

$('#roster thead').addEventListener('click', (event) => {
  const th = event.target.closest('th[data-sort]');
  if (!th) return;
  const key = th.dataset.sort;
  state.sort =
    state.sort.key === key
      ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'handle' ? 'asc' : 'desc' };
  for (const other of th.parentElement.children) other.classList.remove('sorted-asc', 'sorted-desc');
  th.classList.add(state.sort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
  renderTable();
});

$('#filter').addEventListener('input', (event) => {
  state.filter = event.target.value;
  renderTable();
});

$('#show-inactive').addEventListener('change', (event) => {
  state.showInactive = event.target.checked;
  renderTable();
});

$('#scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer();
});

$('#sync-btn').addEventListener('click', async () => {
  const button = $('#sync-btn');
  button.disabled = true;
  button.textContent = 'Syncing…';
  try {
    const result = await api('/api/sync', { method: 'POST' });
    const failedCount = result.failed.length;
    toast(
      `Synced ${result.synced} page${result.synced === 1 ? '' : 's'}` +
        (failedCount ? ` · ${failedCount} failed (see the Signals column)` : ''),
      failedCount > 0
    );
    await refresh();
  } catch (err) {
    toast(err.message, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Sync now';
  }
});

$('#add-page-btn').addEventListener('click', () => $('#add-dialog').showModal());

$('#add-form').addEventListener('submit', async (event) => {
  const form = event.target;
  if (form.returnValue === 'cancel' || event.submitter?.value === 'cancel') return;
  const data = Object.fromEntries(new FormData(form));
  try {
    const result = await api('/api/pages', { method: 'POST', body: JSON.stringify(data) });
    form.reset();
    await refresh();
    toast(`Added @${result.page.handle} — send them ${location.origin}${result.connectUrl} to link their account`);
  } catch (err) {
    toast(err.message, true);
  }
});

renderSetupBanner();
refresh().then(() => {
  // Deep link: /#page=<id> opens straight into that page's scorecard.
  const deepLink = decodeURIComponent(location.hash.replace('#page=', ''));
  if (deepLink) openDrawer(deepLink);
});
