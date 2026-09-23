/**
 * sign-release.mjs — Code-sign the built release artifacts in place.
 *
 * WHY: Windows Smart App Control (and SmartScreen) block unsigned binaries.
 * There is no per-app exclusion in Smart App Control, so the only way to run
 * a distributed build with SAC enabled is a trusted Authenticode signature.
 *
 * Usage (after `npm run app:build`):
 *   npm run sign
 *
 * Environment variables:
 *   CSC_LINK          Path (or https:// URL, or base64) of the .pfx certificate  [required]
 *   CSC_KEY_PASSWORD  Password of the .pfx certificate                          [required]
 *   SIGN_TIMESTAMP    RFC-3161 timestamp server (default: DigiCert)
 *   SIGNTOOL_PATH     Explicit path to signtool.exe (auto-detected if omitted)
 *
 * See SIGNING_SETUP.md for how to obtain a certificate that Smart App
 * Control accepts (self-signed certificates will NOT work).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const releaseDir = path.join(root, "release");

const cscLink = process.env.CSC_LINK?.trim();
const cscPassword = process.env.CSC_KEY_PASSWORD;
const timestampServer =
  process.env.SIGN_TIMESTAMP || "http://timestamp.digicert.com";

function fail(message) {
  console.error(`\n[x] ${message}`);
  process.exit(1);
}

if (!cscLink) {
  fail(
    "CSC_LINK is not set.\n" +
      "    Set it to your code-signing .pfx file (path, https URL or base64):\n" +
      '      $env:CSC_LINK = "C:\\certs\\studyos-codesign.pfx"\n' +
      '      $env:CSC_KEY_PASSWORD = "<pfx password>"\n' +
      "    Then re-run: npm run sign\n" +
      "    See SIGNING_SETUP.md for how to get a certificate SAC accepts.",
  );
}
if (!cscPassword) {
  fail("CSC_KEY_PASSWORD is not set (the .pfx private-key password).");
}

/** Locate signtool.exe from the Windows SDK, or honour SIGNTOOL_PATH. */
function findSigntool() {
  if (process.env.SIGNTOOL_PATH) {
    if (fs.existsSync(process.env.SIGNTOOL_PATH)) return process.env.SIGNTOOL_PATH;
    fail(`SIGNTOOL_PATH points to a missing file: ${process.env.SIGNTOOL_PATH}`);
  }
  const kitsRoot = "C:\\Program Files (x86)\\Windows Kits\\10\\bin";
  if (!fs.existsSync(kitsRoot)) return null;
  const versions = fs
    .readdirSync(kitsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse(); // newest SDK first
  for (const version of versions) {
    for (const arch of ["x64", "x86"]) {
      const candidate = path.join(kitsRoot, version, arch, "signtool.exe");
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** CSC_LINK may be a plain path, a file:// URL, an https URL or base64 data. */
function resolvePfx() {
  if (/^https?:\/\//i.test(cscLink)) {
    fail(
      "https CSC_LINK requires a download step that is not implemented here. " +
        "Download the .pfx manually and set CSC_LINK to its file path.",
    );
  }
  if (/^file:\/\//i.test(cscLink)) {
    return fileURLToPath(cscLink);
  }
  if (fs.existsSync(cscLink)) {
    return cscLink;
  }
  // Treat as base64-encoded PFX (electron-builder's convention).
  const base64 = cscLink.replace(/^data:application\/x-pkcs12;base64,/i, "");
  if (/^[A-Za-z0-9+/=\s]+$/.test(base64) && base64.length > 128) {
    const tmp = path.join(os.tmpdir(), `studyos-sign-${Date.now()}.pfx`);
    fs.writeFileSync(tmp, Buffer.from(base64, "base64"));
    console.log("decoded CSC_LINK (base64) ->", tmp);
    return tmp;
  }
  fail(`CSC_LINK does not point to an existing file: ${cscLink}`);
}

function runSigntool(signtool, args, label) {
  console.log(`\n> signtool ${args.join(" ")}`);
  const result = spawnSync(signtool, args, { stdio: "inherit" });
  if (result.status !== 0) {
    fail(`${label} failed (signtool exit code ${result.status}).`);
  }
}

// ── collect artifacts ────────────────────────────────────────────────────
const targets = [];
if (fs.existsSync(releaseDir)) {
  for (const file of fs.readdirSync(releaseDir)) {
    if (/^StudyOS Setup .*\.exe$/i.test(file)) {
      targets.push(path.join(releaseDir, file));
    }
  }
  const unpackedExe = path.join(releaseDir, "win-unpacked", "StudyOS.exe");
  if (fs.existsSync(unpackedExe)) targets.push(unpackedExe);
}
if (targets.length === 0) {
  fail(
    "No release artifacts found in release/. Run `npm run app:build` first.",
  );
}

// ── sign ─────────────────────────────────────────────────────────────────
const signtool = findSigntool();
if (!signtool) {
  fail(
    "signtool.exe not found on this machine (Windows SDK is not installed).\n" +
      "    Two options:\n" +
      "    1. RECOMMENDED — skip this script entirely: electron-builder signs\n" +
      "       natively during the build with no SDK required:\n" +
      '         $env:CSC_LINK = "C:\\certs\\studyos-codesign.pfx"\n' +
      '         $env:CSC_KEY_PASSWORD = "<pfx password>"\n' +
      "         npm run app:build\n" +
      "    2. Install the Windows SDK (Windows Kits 10) to make this standalone\n" +
      "       `npm run sign` script work, or point SIGNTOOL_PATH at signtool.exe.\n" +
      "    See SIGNING_SETUP.md for how to get a certificate SAC accepts.",
  );
}
console.log("signtool:", signtool);

const pfxPath = resolvePfx();
for (const target of targets) {
  runSigntool(
    signtool,
    [
      "sign",
      "/fd", "SHA256",
      "/td", "SHA256",
      "/tr", timestampServer,
      "/f", pfxPath,
      "/p", cscPassword,
      target,
    ],
    `Signing ${path.basename(target)}`,
  );
}

// ── verify ───────────────────────────────────────────────────────────────
for (const target of targets) {
  runSigntool(
    signtool,
    ["verify", "/pa", "/all", target],
    `Verifying ${path.basename(target)}`,
  );
}

console.log(
  `\n[ok] Signed ${targets.length} artifact(s). Smart App Control should now ` +
    "accept them once the certificate has cloud reputation\n" +
    "     (EV certificates and Azure Trusted Signing are trusted immediately; " +
    "OV certificates may need a little time/installs).",
);
