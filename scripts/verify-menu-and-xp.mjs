// Verify BOTH fixes in the built app (demo mode):
//  1. Menu button renders at full size with its icon at every viewport.
//  2. Profile "Learning level" card shows real XP progress (60 XP -> 60/400).
// Run: node scripts/verify-menu-and-xp.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DIST = "C:\\website\\study-os-main\\dist";
const PORT = 51995;

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const server = http.createServer((req, res) => {
  try {
    let filePath = path.join(DIST, decodeURIComponent(new URL(req.url || "/", "http://x").pathname));
    if (!filePath.startsWith(DIST)) filePath = DIST;
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(DIST, "index.html");
    res.setHeader("Content-Type", mime[path.extname(filePath)] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  } catch { res.statusCode = 500; res.end(); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${PORT}`;

const FIREBASE_VALUES = ["AIzaSyCRx8URHnJ1PpFV0vVxm5xlc9ns-Sz4daY", "study-os-f9bba.firebaseapp.com", "study-os-f9bba", "study-os-f9bba.firebasestorage.app", "974604096916", "1:974604096916:web:6cc8129ef1271e5049eb81", "G-32ZZEXSLZ1"];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 744 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", String(e)));

await page.route(/\.js(\?.*)?$/, async (route) => {
  const response = await route.fetch();
  let body = await response.text();
  for (const v of FIREBASE_VALUES) body = body.split(v).join("");
  await route.fulfill({ response, body });
});
await page.route("**/firebase-config.json", (route) => route.abort());

await page.goto(ORIGIN + "/");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(3000);

let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
};

// ── Fix 2: menu button ──
for (const width of [1100, 1280, 1600]) {
  await page.setViewportSize({ width, height: 744 });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const btn = document.querySelector('button[title="Toggle menu"]');
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const svg = btn.querySelector("svg");
    const s = svg?.getBoundingClientRect();
    return { w: rect.width, h: rect.height, svgW: s?.width, svgH: s?.height };
  });
  ok(`menu button ${width}px is 40x40 with 20x20 icon`, !!m && Math.abs(m.w - 40) < 1 && Math.abs(m.h - 40) < 1 && Math.abs(m.svgW - 20) < 1, JSON.stringify(m));
}

// maximize-equivalent: widest layout already covered; screenshot the corner
await page.setViewportSize({ width: 1280, height: 744 });
await page.waitForTimeout(400);
await page.screenshot({ path: "scripts/_verify_corner.png", clip: { x: 0, y: 0, width: 480, height: 110 } });

// ── Fix 1: XP progress on the profile page (demo user has 2450 XP) ──
await page.evaluate(() => { history.pushState({}, "", "/profile"); window.dispatchEvent(new PopStateEvent("popstate")); });
await page.waitForTimeout(2000);
const profile = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("p"));
  const level = cards.find((p) => p.textContent.startsWith("Level "))?.textContent;
  const xpLine = cards.find((p) => /XP to level/.test(p.textContent))?.textContent;
  const bar = document.querySelector(".h-2 > .h-full, div.h-2 > div");
  const pct = bar ? bar.style.width : null;
  return { level, xpLine, pct };
});
console.log("PROFILE:", JSON.stringify(profile));
ok("profile shows Level 4 for 2450 XP", profile.level === "Level 4", profile.level);
ok("profile shows 850 / 900 XP to level 5", (profile.xpLine || "").replace(/\s/g, " ").includes("850 / 900 XP to level 5"), profile.xpLine);
ok("progress bar ~94%", profile.pct === "94%", profile.pct);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
