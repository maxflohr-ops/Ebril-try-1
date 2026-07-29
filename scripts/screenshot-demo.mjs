// Screenshot the demo flow with Playwright. Used to generate marketing /
// README imagery without needing a GUI on the host.
//
// Prerequisites:
//   1. Run the demo locally per docs/demo.md (dev server on :3000, seed-demo
//      already executed).
//   2. Install playwright + the chromium browser:
//        npm i -D playwright
//        npx playwright install chromium
//   3. Run this script:
//        node scripts/screenshot-demo.mjs
//
// Outputs PNGs to ./demo-screens/ (gitignored). Override the base URL with
// `DEMO_BASE=http://...` if the server isn't on :3000.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.DEMO_BASE ?? "http://127.0.0.1:3000";
const DIR = "demo-screens";

const SHOTS = [
  { name: "00-demo-picker", path: "/demo" },
  { name: "01-vibe-intro", path: "/vibe", w: 440 },
  { name: "02-landing-guest", path: "/", w: 440 },
  { name: "03-home-hana", path: "/", as: "demo-hana" },
  { name: "04-diary-hana", path: "/diary", as: "demo-hana" },
  { name: "05-wrapped-hana", path: "/wrapped", as: "demo-hana" },
  { name: "06-eras", path: "/eras", as: "demo-hana" },
  { name: "07-wall-public", path: "/wall" },
  { name: "08-leaderboard", path: "/leaderboard", as: "demo-hana" },
  { name: "09-collection-hana", path: "/collection", as: "demo-hana" },
  { name: "10-gift-hana", path: "/gift", as: "demo-hana" },
  { name: "11-admin-dashboard", path: "/admin", as: "demo-mars" },
  { name: "12-admin-clips", path: "/admin/clips?status=featured", as: "demo-mars" },
  { name: "13-onboarding-rhea", path: "/welcome", as: "demo-rhea" },
];

await mkdir(DIR, { recursive: true });
const browser = await chromium.launch();
for (const s of SHOTS) {
  const width = s.w ?? 900;
  const height = 1400;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  if (s.as) {
    await page.goto(`${BASE}/api/demo/sign-in?as=${s.as}`, {
      waitUntil: "networkidle",
    });
  }
  const resp = await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/${s.name}.png`, fullPage: true });
  await ctx.close();
  console.log(`${s.name} ← ${resp?.status()} · ${s.path}`);
}
await browser.close();
