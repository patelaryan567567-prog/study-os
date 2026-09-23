// Real-input test of the sidebar close button in the packaged Electron app.
// Uses CDP for DOM state and real Win32 mouse events for the click, because
// app-region drag interception only happens with real input.
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
const page = browser.contexts()[0].pages()[0];
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2000);

function winRect() {
  const out = execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\\website\\study-os-main\\scripts\\win-click.ps1" -Mode restore`,
    { encoding: "utf8" },
  ).trim();
  const [L, T] = out.split(",").map(Number);
  return { left: L, top: T };
}

function realClick(x, y) {
  execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\\website\\study-os-main\\scripts\\win-click.ps1" -Mode click -X ${x} -Y ${y}`,
    { encoding: "utf8" },
  );
}

// Login only if the login form is showing
const emailBox = page.getByRole("textbox").first();
if (await emailBox.isVisible({ timeout: 3000 }).catch(() => false)) {
  await emailBox.fill("qa-icon-test@studyos.app");
  await page.getByRole("textbox", { name: "Password" }).fill("Test12345!");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForTimeout(4000);
}
console.log("url:", page.url());

// Open sidebar via menu (DOM click ok — testing only the X button with real input)
const aside = page.getByRole("complementary");
let asideBox = await aside.boundingBox();
if (!asideBox || asideBox.x < -100) {
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page.waitForTimeout(1500);
  asideBox = await aside.boundingBox();
}
console.log("aside open at:", asideBox);
if (!asideBox || asideBox.x < -100) {
  console.log("sidebar did not open — menu click failed, aborting");
  process.exit(2);
}

// Get X button (first button in the aside header)
const btn = aside.getByRole("button").first();
const btnBox = await btn.boundingBox();
console.log("close button at:", btnBox);

const wr = winRect();
console.log("window rect origin:", wr);
const sx = Math.round(wr.left + btnBox.x + btnBox.width / 2);
const sy = Math.round(wr.top + btnBox.y + btnBox.height / 2);
console.log("clicking screen coords:", sx, sy);

realClick(sx, sy);
await page.waitForTimeout(1200);

const after = await aside.boundingBox();
console.log("aside after click:", after);
const closed = after && after.x < -200;
console.log(closed ? "RESULT: CLOSED — fix works in Electron" : "RESULT: STILL OPEN — fix NOT working");
await browser.close();
