import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.DEMO_BASE ?? "http://127.0.0.1:3000";
const DIR = "demo-screens";

const SHOTS = [
  { name: "sp-01-fan",         path: "/season-pass",                              as: "demo-hana", w: 480, h: 2200 },
  { name: "sp-02-admin-queue", path: "/admin/season-pass/submissions",            as: "demo-mars", w: 1000, h: 1300 },
  { name: "sp-03-admin-index", path: "/admin/season-pass",                        as: "demo-mars", w: 1000, h: 900 },
];

await mkdir(DIR, { recursive: true });
const browser = await chromium.launch();

// Get season id for the editor shot
const ctx0 = await browser.newContext({ viewport: { width: 1000, height: 900 } });
const p0 = await ctx0.newPage();
await p0.goto(`${BASE}/api/demo/sign-in?as=demo-mars`, { waitUntil: "networkidle" });
await p0.goto(`${BASE}/admin/season-pass`, { waitUntil: "networkidle" });
const seasonHref = await p0.evaluate(() => {
  const a = document.querySelector('a[href^="/admin/season-pass/"]:not([href$="/submissions"])');
  return a ? a.getAttribute("href") : null;
});
await ctx0.close();

if (seasonHref) {
  SHOTS.push({
    name: "sp-04-admin-editor",
    path: seasonHref,
    as: "demo-mars",
    w: 1000,
    h: 1500,
  });
}

for (const s of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  if (s.as) {
    await page.goto(`${BASE}/api/demo/sign-in?as=${s.as}`, { waitUntil: "networkidle" });
  }
  const resp = await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/${s.name}.png`, fullPage: true });
  await ctx.close();
  console.log(`${s.name} ← ${resp?.status()} · ${s.path}`);
}
await browser.close();
