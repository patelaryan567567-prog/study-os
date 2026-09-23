// Verify the FIXED build: lecture completion awards XP + coins to the store.
// Serves dist (new build), forces demo mode, drives the click flow.
// Run: node scripts/verify-fix.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DIST = "C:\\website\\study-os-main\\dist";
const PORT = 51997;

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2" };
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

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

const FIREBASE_VALUES = ["AIzaSyCRx8URHnJ1PpFV0vVxm5xlc9ns-Sz4daY", "study-os-f9bba.firebaseapp.com", "study-os-f9bba", "study-os-f9bba.firebasestorage.app", "974604096916", "1:974604096916:web:6cc8129ef1271e5049eb81", "G-32ZZEXSLZ1"];
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
await page.waitForTimeout(2000);

// go to lecture tracker
await page.evaluate(() => {
  history.pushState({}, "", "/lectures");
  window.dispatchEvent(new PopStateEvent("popstate"));
});
await page.waitForTimeout(2000);

// 1) Chapter should be addable WITHOUT any subject (fallback "General").
const before = await page.evaluate(() => {
  const chapterInput = document.querySelector('input[placeholder*="Chapter for"]');
  const addBtn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Add Chapter"));
  return {
    placeholder: chapterInput?.placeholder,
    addBtnDisabled: !!(addBtn?.disabled),
    selectValue: document.querySelector("select[aria-label='Select subject']")?.value,
  };
});
console.log("WITHOUT SUBJECT -> chapter input:", JSON.stringify(before));

await page.evaluate(() => {
  const real = document.querySelector('input[placeholder*="Chapter for"], input[placeholder*="Chapter name"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(real, "Physics Ch 1");
  real.dispatchEvent(new Event("input", { bubbles: true }));
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Add Chapter"));
  btn?.click();
});
await page.waitForTimeout(500);
const chapters1 = await page.evaluate(() => document.body.innerText.includes("Physics Ch 1"));
console.log("Chapter added without subject:", chapters1);

// 2) Add lecture and complete it -> XP +10
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Add Lecture"));
  btn?.click();
});
await page.waitForTimeout(300);
const storeBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("studyos-store") || "{}").state?.user?.xp ?? "no-user");
console.log("store xp BEFORE lecture complete:", storeBefore);

// click status twice: pending -> in-progress -> completed
await page.evaluate(() => {
  document.querySelector("button[aria-label^='Change ']")?.click();
});
await page.waitForTimeout(300);
await page.evaluate(() => {
  document.querySelector("button[aria-label^='Change ']")?.click();
});
await page.waitForTimeout(600);

const result = await page.evaluate(() => {
  const store = JSON.parse(localStorage.getItem("studyos-store") || "{}");
  const user = store.state?.user;
  return {
    xp: user?.xp,
    coins: user?.coins,
    storedLecture: localStorage.getItem("studyos_lecture_tracker_v1"),
    toastShown: document.body.innerText.includes("Lecture completed (+10 XP)"),
  };
});
console.log("AFTER COMPLETE:", JSON.stringify(result, null, 2));

// 3) simulate AuthProvider fallback path: keep persisted user when same uid
// (covered implicitly: store.xp persisted from addXP above already)
console.log("\n--- PAGE ERRORS ---"); for (const e of pageErrors) console.log(e);

await browser.close();
server.close();