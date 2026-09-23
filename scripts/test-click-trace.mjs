import { chromium } from "playwright-core";
import { execSync } from "node:child_process";

const ps = (args) =>
  execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\\website\\study-os-main\\scripts\\win-click.ps1" ${args}`,
    { encoding: "utf8" },
  ).trim();

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
const page = browser.contexts()[0].pages()[0];

// Record all real pointer/click events in the page
await page.evaluate(`(() => {
  window.__evts = [];
  for (const t of ["pointerdown", "mousedown", "click"]) {
    document.addEventListener(t, (e) => {
      window.__evts.push([t, Math.round(e.clientX), Math.round(e.clientY),
        e.target.tagName + "." + String(e.target.className).slice(0, 60)]);
    }, true);
  }
})()`);

const [L, T] = ps("-Mode restore").split(",").map(Number);
console.log("window origin:", L, T);

// Real click on the sidebar close button (viewport 237,53)
ps(`-Mode click -X ${L + 237} -Y ${T + 53}`);
await page.waitForTimeout(1000);
console.log("events:", JSON.stringify(await page.evaluate("window.__evts"), null, 1));
console.log("aside:", JSON.stringify(await page.getByRole("complementary").boundingBox()));
process.exit(0);
