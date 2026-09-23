import { chromium } from "playwright-core";
import { execSync } from "node:child_process";

const click = (x, y) =>
  execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\\website\\study-os-main\\scripts\\win-click.ps1" -Mode click -X ${x} -Y ${y}`,
    { encoding: "utf8" },
  );

const rect = () =>
  execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\\website\\study-os-main\\scripts\\win-click.ps1" -Mode rect`,
    { encoding: "utf8" },
  )
    .trim()
    .split(",")
    .map(Number);

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser.contexts()[0].pages()[0];
const aside = page.getByRole("complementary");
console.log("aside before:", JSON.stringify(await aside.boundingBox()));

const [L, T] = rect();
console.log("window origin:", L, T);

// Backdrop click at viewport (500, 400) — below the 72px topbar drag strip
click(L + 500, T + 400);
await page.waitForTimeout(1200);
console.log("aside after backdrop click:", JSON.stringify(await aside.boundingBox()));
process.exit(0);
