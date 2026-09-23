// Verify the restart-wipe fix: seed saved data, simulate several app restarts
// (route visits + reloads) and assert every store key still holds its data.
// Serves dist (freshly built), forces demo mode (no Firebase).
// Run: node scripts/verify-persist-fix.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DIST = path.join(process.cwd(), "dist");
const PORT = 51998;

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
page.on("dialog", (d) => d.accept());

// Force demo mode (no Firebase): blank the compiled Firebase values + abort runtime config.
const FIREBASE_VALUES = ["AIzaSyCRx8URHnJ1PpFV0vVxm5xlc9ns-Sz4daY", "study-os-f9bba.firebaseapp.com", "study-os-f9bba", "study-os-f9bba.firebasestorage.app", "974604096916", "1:974604096916:web:6cc8129ef1271e5049eb81", "G-32ZZEXSLZ1"];
await page.route(/.js(\?.*)?$/, async (route) => {
  const response = await route.fetch();
  let body = await response.text();
  for (const v of FIREBASE_VALUES) body = body.split(v).join("");
  await route.fulfill({ response, body });
});
await page.route("**/firebase-config.json", (route) => route.abort());

const SEED = {
  "studyos_backlog_v1": [
    { id: "b_seed1", chapter: "Chapter 1", title: "Seed Backlog Item", dueDate: "2026-09-03", type: "Lecture", status: "pending", priority: 2, reminder: null, notes: "keep me" },
  ],
  "studyos_module_tracker_v1": [
    { id: "chap_seed1", name: "Seed Chapter", items: [{ id: "m_seed1", title: "Seed Exercise", type: "Exercise", status: "pending" }] },
  ],
  "studyos_notes_v1": {
    folders: ["Seed Folder"],
    notes: [{ id: "n_seed1", title: "Seed Note", content: "keep me", mode: "markdown", folder: "Seed Folder", tags: [], bookmarked: false, attachments: [], createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" }],
  },
  "studyos_calendar_events_v1": [
    { id: "e_seed1", title: "Seed Exam", date: "2026-09-10", type: "exam", color: "primary", reminder: 15 },
  ],
  "studyos_revision_flashcards_v1": [
    { id: "fc_seed1", front: "Q", back: "A", subject: "Math", step: 0, nextReview: "2026-09-02T00:00:00.000Z", reviewCount: 0, createdAt: "2026-09-01T00:00:00.000Z" },
  ],
  "studyos_planner_v1": [
    { id: "p_seed1", title: "Seed Plan", type: "study", date: "2026-09-03", status: "pending", createdAt: "2026-09-01T00:00:00.000Z" },
  ],
  "studyos_lecture_tracker_v1": [
    { id: "chap_seed1", subject: "Physics", name: "Seed Chapter", lectures: [{ id: "lec_seed1", title: "Seed Lecture", status: "pending", bookmarked: false, notes: "keep me" }] },
  ],
  "studyos_lecture_subjects_v1": ["Physics"],
  "studyos_reminders_v1": [
    { id: "r_seed1", type: "custom", title: "Seed Reminder", time: new Date(Date.now() + 3600_000).toISOString(), repeat: "none", notified: false },
  ],
};

const ROUTES = [
  "/backlog", "/modules", "/notes", "/calendar", "/revision", "/planner", "/lectures", "/reminders",
];

await page.goto(ORIGIN + "/");
await page.waitForTimeout(2000);
await page.evaluate((seed) => {
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
}, SEED);
console.log("Seeded", Object.keys(SEED).length, "store keys.");
const snapshot = () =>
  page.evaluate((keys) => {
    const out = {};
    for (const k of keys) {
      try { out[k] = JSON.parse(localStorage.getItem(k) || "MISSING"); } catch { out[k] = "<corrupt>"; }
    }
    return out;
  }, Object.keys(SEED));

let failures = 0;

// Simulate repeated restarts: visit every module route, then reload the page.
for (let cycle = 1; cycle <= 3; cycle++) {
  for (const route of ROUTES) {
    await page.goto(ORIGIN + route);
    await page.waitForTimeout(2500); // allow async loadStore + persist effects to run
  }
  await page.goto(ORIGIN + "/");
  await page.waitForTimeout(2000);
  const state = await snapshot();
  console.log(`\n--- After restart cycle ${cycle} ---`);
  for (const [k, v] of Object.entries(state)) {
    const nonEmpty = Array.isArray(v) ? v.length > 0 : (v && typeof v === "object" ? (v.notes.length + v.folders.length) > 0 : false);
    if (!nonEmpty) { failures++; console.log(`  FAIL ${k}: data lost (${JSON.stringify(v).slice(0, 80)})`); }
    else console.log(`  OK   ${k}: kept ${JSON.stringify(v).length} chars of data`);
  }
}

// A genuine user addition must still persist after hydration (guard must not block real changes).
await page.goto(ORIGIN + "/backlog");
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const key = "studyos_backlog_v1";
  const items = JSON.parse(localStorage.getItem(key) || "[]");
  items.push({ id: "b_new1", chapter: "Chapter 2", title: "Added After Load", dueDate: null, type: "Revision", status: "pending", priority: 1, reminder: null, notes: "" });
  localStorage.setItem(key, JSON.stringify(items));
});
await page.reload();
await page.waitForTimeout(2500);
const afterAdd = await snapshot();
const backlog = afterAdd["studyos_backlog_v1"];
if (Array.isArray(backlog) && backlog.some((b) => b.id === "b_new1")) {
  console.log("\n  OK   user addition after load survived a restart");
} else {
  failures++;
  console.log("\n  FAIL user addition after load did not survive restart");
}

console.log("\nPage errors:", pageErrors.length ? pageErrors.slice(0, 5) : "none");
await browser.close();
server.close();
console.log(failures === 0 ? "\nRESULT: PASS — no data lost across restarts." : `\nRESULT: FAIL — ${failures} store(s) lost data.`);
process.exit(failures === 0 ? 0 : 1);