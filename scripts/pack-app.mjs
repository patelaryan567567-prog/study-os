// Repacks the StudyOS app.asar for the installed app folder using the current
// dist + dist-electron builds. Safe to rerun.
// Run: node scripts/pack-app.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO = "C:\\website\\study-os-main";
const INSTALLED_APP = "C:\\website\\study os APP\\StudyOS\\resources\\app.asar";
const STAGING = path.join(REPO, "scripts", "staging-app");
const STAGED_ASAR = path.join(REPO, "scripts", "staging-app.asar");
const ASAR_BAK = path.join(REPO, "scripts", "app.asar.pre-fix.bak");

// 1. Reset staging
fs.rmSync(STAGING, { recursive: true, force: true });
fs.mkdirSync(STAGING, { recursive: true });

// 2. Copy dist + dist-electron
for (const sub of ["dist", "dist-electron"]) {
  fs.cpSync(path.join(REPO, sub), path.join(STAGING, sub), { recursive: true });
}

// 3. Root package.json (same shape electron-builder produced)
const packageJson = {
  name: "studyos",
  private: true,
  version: "1.0.0",
  type: "module",
  engines: { node: ">=22.12.0" },
  dependencies: {
    "@capacitor-firebase/authentication": "^8.4.0",
    "@capacitor/android": "^8.5.0",
    "@capacitor/core": "^8.5.0",
    "@google/generative-ai": "^0.24.1",
    "@radix-ui/react-dialog": "^1.1.23",
    "@radix-ui/react-dropdown-menu": "^2.1.24",
    "@radix-ui/react-popover": "^1.1.23",
    "@radix-ui/react-select": "^2.3.7",
    "@radix-ui/react-slot": "^1.3.3",
    "@radix-ui/react-tooltip": "^1.2.16",
    "chart.js": "^4.5.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.4.0",
    "firebase": "^12.17.0",
    "framer-motion": "^12.43.0",
    "idb": "^8.0.3",
    "lucide-react": "^1.28.0",
    "react": "^18.2.0",
    "react-chartjs-2": "^5.3.1",
    "react-dom": "^18.2.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.18.2",
    "remark-gfm": "^4.0.1",
    "tailwind-merge": "^3.6.0",
    "zustand": "^5.0.14",
  },
  main: "dist-electron/main.js",
  description: "StudyOS - smart learning platform with focus tools and app blocker",
  author: "StudyOS",
};
fs.writeFileSync(
  path.join(STAGING, "package.json"),
  JSON.stringify(packageJson, null, 2),
);
fs.writeFileSync(
  path.join(STAGING, "dist-electron", "package.json"),
  JSON.stringify({ type: "commonjs" }),
);

// 4. Pack
const { createPackage } = await import(
  pathToFileURL(
    path.join(REPO, "node_modules", "@electron", "asar", "lib", "asar.js"),
  )
);
if (fs.existsSync(STAGED_ASAR)) fs.rmSync(STAGED_ASAR, { force: true });
await createPackage(STAGING, STAGED_ASAR);

// 5. Backup + replace installed app.asar
// Keep the very first pre-fix backup intact; rotate later versions.
const BAK_PREV = path.join(REPO, "scripts", "app.asar.prev.bak");
if (!fs.existsSync(ASAR_BAK)) {
  fs.renameSync(INSTALLED_APP, ASAR_BAK);
} else {
  if (fs.existsSync(BAK_PREV)) fs.rmSync(BAK_PREV, { force: true });
  fs.renameSync(INSTALLED_APP, BAK_PREV);
}
fs.renameSync(STAGED_ASAR, INSTALLED_APP);
console.log("New app.asar installed at", INSTALLED_APP);