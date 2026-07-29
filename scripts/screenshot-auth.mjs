import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.DEMO_BASE ?? "http://127.0.0.1:3000";
const DIR = "demo-screens";

const SHOTS = [
  { name: "auth-01-rhea-profile",  path: "/profile", as: "demo-rhea", w: 480, h: 2400 },
  { name: "auth-02-hana-profile",  path: "/profile", as: "demo-hana", w: 480, h: 2400 },
];

await mkdir(DIR, { recursive: true });
const browser = await chromium.launch();
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
