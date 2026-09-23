/**
 * Compiles the electron/ TypeScript sources (main, preload, autoUpdater,
 * appBlocker) to plain CommonJS in dist-electron/ so `electron .` can run
 * without an extra bundler. Re-run after changing electron files.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { ensureIcons } from "./generate-icons.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcDir = path.join(root, "electron");
const outDir = path.join(root, "dist-electron");

// Make sure the Windows app icon exists before the main process build.
ensureIcons(root);

/**
 * Some Windows setups (Windows Defender / controlled folder access) block
 * electron-builder's "extract to <out>.tmp then rename" step with EPERM.
 * Restore the pre-extracted Electron distribution (electron-dist/) from the
 * local @electron/get cache so electron-builder copies instead of renaming.
 */
function ensureElectronDist() {
  if (process.platform !== "win32") return;
  const destDir = path.join(root, "electron-dist");
  if (fs.existsSync(path.join(destDir, "electron.exe"))) return;

  let version = null;
  try {
    version = JSON.parse(
      fs.readFileSync(path.join(root, "node_modules", "electron", "package.json"), "utf-8"),
    ).version;
  } catch {
    // fall back to "any win32-x64 zip"
  }

  const cacheBase = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
    "electron",
    "Cache",
  );

  let zipFile = null;
  const walk = (dir, depth) => {
    if (!fs.existsSync(dir) || depth > 4) return null;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const hit = walk(full, depth + 1);
        if (hit) return hit;
      } else if (
        entry.name.endsWith(".zip") &&
        entry.name.toLowerCase().includes("win32-x64") &&
        (!version || entry.name.includes(`-${version}-`))
      ) {
        return full;
      }
    }
    return null;
  };

  if (!fs.existsSync(path.join(destDir, "electron.exe"))) {
    zipFile = walk(cacheBase, 0);
    if (!zipFile) {
      console.warn(
        "electron-dist missing and no cached Electron zip found — electron-builder " +
          "may hit EPERM on Windows. Run `npx electron --version` once, or add a " +
          "Windows Defender exclusion for this folder.",
      );
      return;
    }
    fs.mkdirSync(destDir, { recursive: true });
    console.log("restoring electron-dist from", zipFile);
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${zipFile}' -DestinationPath '${destDir}' -Force`,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0 || !fs.existsSync(path.join(destDir, "electron.exe"))) {
      throw new Error("Failed to restore electron-dist from the local cache.");
    }
  }
}

ensureElectronDist();

fs.mkdirSync(outDir, { recursive: true });
// root package.json is "type": "module"; electron output must stay CommonJS
fs.writeFileSync(
  path.join(outDir, "package.json"),
  '{ "type": "commonjs" }\n',
  "utf-8",
);

for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith(".ts")) continue;
  const source = fs.readFileSync(path.join(srcDir, file), "utf-8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: file,
  });
  fs.writeFileSync(
    path.join(outDir, file.replace(/\.ts$/, ".js")),
    outputText,
    "utf-8",
  );
  console.log("compiled", file);
}
console.log("electron build ->", outDir);
