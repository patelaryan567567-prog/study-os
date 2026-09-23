// FINAL live verification (CDP port 9223): fixed bundle check, debug-data
// cleanup, XP seeding + lecture-completion XP proof, then data restore.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
let page = null;
for (const ctx of browser.contexts())
  for (const p of ctx.pages()) if (p.url().includes("51799")) page = p;
if (!page) { console.error("No page found"); process.exit(1); }
console.log("Connected to:", page.url());
page.on("dialog", (d) => d.accept());

// 1) Reload so renderer loads bundles from the NEW asar
await page.reload();
await page.waitForTimeout(3000);
const bundles = await page.evaluate(() =>
  performance.getEntriesByType("resource").map((r) => r.name)
    .filter((n) => n.includes("LectureTracker")).map((n) => n.split("/").pop()));
console.log("LectureTracker bundle:", JSON.stringify(bundles));
const xpSeed = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("studyos-store") || "{}");
  return { userXp: s.state?.user?.xp, coins: s.state?.user?.coins };
});
console.log("XP after restart (expect >=60 seeded from local progress):", JSON.stringify(xpSeed));

// 2) Clean up repro-script leftovers
await page.evaluate(() => {
  const P = ["Live Test Subject", "Pointer Test"];
  const subjects = JSON.parse(localStorage.getItem("studyos_lecture_subjects_v1") || "[]")
    .filter((s) => !P.some((p) => s.startsWith(p)));
  localStorage.setItem("studyos_lecture_subjects_v1", JSON.stringify(subjects));
  const chapters = JSON.parse(localStorage.getItem("studyos_lecture_tracker_v1") || "[]")
    .filter((c) => !P.some((p) => (c.subject || "").startsWith(p)) && c.name !== "Live Chapter 1787411504075");
  localStorage.setItem("studyos_lecture_tracker_v1", JSON.stringify(chapters));
});
console.log("Test subjects/chapters cleaned.");

// 3) Fresh lecture tracker view
const base = new URL(page.url()).origin;
await page.evaluate((b) => {
  history.pushState({}, "", b + "/lectures");
  window.dispatchEvent(new PopStateEvent("popstate"));
}, base);
await page.reload();
await page.waitForTimeout(2500);
const uiState = await page.evaluate(() => ({
  subjects: [...document.querySelectorAll("select[aria-label='Select subject'] option")].map((o) => o.text),
  chapters: [...document.querySelectorAll("h3")].map((h) => h.textContent),
}));
console.log("UI after cleanup:", JSON.stringify(uiState));

// 4) Smoke test: add chapter -> add lecture -> complete -> XP +10
await page.locator('input[placeholder*="Chapter for"], input[placeholder*="Chapter name"]').first().fill("Smoke Test Chapter");
await page.getByRole("button", { name: /Add Chapter/ }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Add Lecture/ }).first().click();
await page.waitForTimeout(400);
const xpBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("studyos-store") || "{}").state?.user?.xp);
const statusBtn = page.locator("button[aria-label^='Change ']").first();
await statusBtn.click(); // pending -> in-progress
await page.waitForTimeout(250);
await statusBtn.click(); // in-progress -> completed (+10 XP)
await page.waitForTimeout(600);
const smoke = await page.evaluate(() => {
  const store = JSON.parse(localStorage.getItem("studyos-store") || "{}");
  const chapters = JSON.parse(localStorage.getItem("studyos_lecture_tracker_v1") || "[]");
  return {
    xp: store.state?.user?.xp,
    coins: store.state?.user?.coins,
    statuses: chapters.flatMap((c) => c.lectures.map((l) => l.status)),
    toast: document.body.innerText.includes("Lecture completed"),
  };
});
console.log("SMOKE TEST:", JSON.stringify(smoke), "| XP delta:", smoke.xp - xpBefore);

// 5) Restore original data (drop smoke-test artifacts, roll back test XP)
await page.evaluate((xpBefore) => {
  const chapters = JSON.parse(localStorage.getItem("studyos_lecture_tracker_v1") || "[]")
    .filter((c) => c.name !== "Smoke Test Chapter");
  localStorage.setItem("studyos_lecture_tracker_v1", JSON.stringify(chapters));
  const used = [...new Set(chapters.map((c) => c.subject))];
  const subjects = JSON.parse(localStorage.getItem("studyos_lecture_subjects_v1") || "[]")
    .filter((s) => used.includes(s) || s === "General");
  localStorage.setItem("studyos_lecture_subjects_v1", JSON.stringify(subjects));
  const store = JSON.parse(localStorage.getItem("studyos-store") || "{}");
  if (store.state?.user) {
    store.state.user.xp = xpBefore;
    store.state.user.coins = Math.max(0, (store.state.user.coins ?? 0) - 5);
  }
  localStorage.setItem("studyos-store", JSON.stringify(store));
}, xpBefore);
console.log("Original lecture data restored; XP rolled back to", xpBefore);

// 6) Restart-proof: reload -> AuthProvider fallback must KEEP the XP
await page.reload();
await page.waitForTimeout(3000);
const finalState = await page.evaluate(() => {
  const store = JSON.parse(localStorage.getItem("studyos-store") || "{}");
  return {
    xpAfterReload: store.state?.user?.xp,
    level: store.state?.user?.level,
    subjects: localStorage.getItem("studyos_lecture_subjects_v1"),
    chapters: localStorage.getItem("studyos_lecture_tracker_v1"),
  };
});
console.log("FINAL AFTER RELOAD:", JSON.stringify(finalState, null, 2));
console.log(finalState.xpAfterReload === xpBefore
  ? "PASS: XP survived restart (fallback preserved it)"
  : "FAIL: XP changed across restart!");
await browser.close();
