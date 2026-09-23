/**
 * Generates StudyOS placeholder application icons (build/icon.ico + icon.png)
 * when none exist yet.
 *
 * - build/icon.ico  -> Windows installer / EXE / taskbar icon (electron-builder)
 * - build/icon.png  -> tray icon (packaged into resources via extraResources)
 *
 * PNG-compressed ICO entries are used (valid on Windows Vista+ / 10 / 11).
 *
 * The generator is a no-op once build/icon.ico exists, so you can drop in your
 * own branded icon later and it will never be overwritten.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

/* ------------------------------- PNG utils ------------------------------- */

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(size, pixelFn) {
  const stride = 1 + size * 4; // filter byte + RGBA row
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(size, x, y);
      const p = rowStart + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  const entries = Buffer.alloc(16 * pngs.length);
  let offset = 6 + 16 * pngs.length;
  pngs.forEach((png, i) => {
    const e = i * 16;
    entries[e] = png.size >= 256 ? 0 : png.size; // 0 means 256
    entries[e + 1] = png.size >= 256 ? 0 : png.size;
    entries[e + 2] = 0; // color palette
    entries[e + 3] = 0; // reserved
    entries.writeUInt16LE(1, e + 4); // color planes
    entries.writeUInt16LE(32, e + 6); // bits per pixel
    entries.writeUInt32LE(png.data.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += png.data.length;
  });

  return Buffer.concat([header, entries, ...pngs.map((p) => p.data)]);
}

/* ------------------------------- icon art -------------------------------- */

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(a, b, amount) {
  return [
    lerp(a[0], b[0], amount),
    lerp(a[1], b[1], amount),
    lerp(a[2], b[2], amount),
    lerp(a[3], b[3], amount),
  ];
}

function smoothstep(d) {
  // 1px soft edge around a distance value
  const v = clamp01((Math.abs(d) + 1) / 2);
  return Math.max(0, Math.min(1, v));
}

function pixelFor(c) {
  return [
    Math.round(clamp01(c[0]) * 255),
    Math.round(clamp01(c[1]) * 255),
    Math.round(clamp01(c[2]) * 255),
    Math.round(clamp01(c[3]) * 255),
  ];
}

/**
 * StudyOS app icon: rounded-square tile on the brand gradient (violet->sky)
 * with a white four-point spark — matches the in-app logo/branding.
 */
function iconPixel(size, x, y) {
  const s = size;
  const bx = x + 0.5;
  const by = y + 0.5;

  // Background: rounded square (account for corner radius)
  const cy = Math.max(s * 0.22, Math.min(by, s * 0.78));
  const cx = Math.max(s * 0.22, Math.min(bx, s * 0.78));
  const dxc = bx > cx ? bx - s * 0.78 : bx < s * 0.22 ? s * 0.22 - bx : 0;
  const dyc = by > cy ? by - s * 0.78 : by < s * 0.22 ? s * 0.22 - by : 0;
  const corner = Math.hypot(dxc, dyc);
  const bgAlpha = corner > s * 0.22 ? 1 - Math.min(1, corner - s * 0.22 + 1) : 1;
  if (bgAlpha <= 0) return [0, 0, 0, 0];

  // Brand gradient: #7c6af7 (violet) -> #38bdf8 (sky)
  const t = clamp01((bx + by) / (2 * s));
  const r = lerp(0.486, 0.220, t);
  const g = lerp(0.416, 0.741, t);
  const b = lerp(0.969, 0.973, t);

  let color = [r, g, b, bgAlpha];

  // White four-point spark, centred, thinning toward each tip.
  const px = (bx / s) * 2 - 1;
  const py = (by / s) * 2 - 1;
  const rr = Math.hypot(px, py);
  if (rr <= 1.05) {
    const w = 0.62 * (1 - rr);
    const d = Math.max(Math.abs(px) - w, Math.abs(py) - w);
    const spark = 1 - clamp01(d * 5);
    color = mix(color, [1, 1, 1, 1], spark * 0.92);
  }

  return pixelFor(color);
}

function roundedRectAlpha(bx, by, x0, y0, x1, y1, radius) {
  const nx = Math.max(x0 + radius, Math.min(bx, x1 - radius));
  const ny = Math.max(y0 + radius, Math.min(by, y1 - radius));
  const d = Math.hypot(bx - nx, by - ny) - radius;
  if (bx >= x0 + radius && bx <= x1 - radius && by >= y0 && by <= y1) return 1;
  if (bx >= x0 && bx <= x1 && by >= y0 + radius && by <= y1 - radius) return 1;
  return 1 - smoothstep(d);
}

function rectAlpha(bx, by, x0, y0, x1, y1) {
  if (bx < x0 || bx > x1 || by < y0 || by > y1) return 0;
  const d = Math.min(bx - x0, x1 - bx, by - y0, y1 - by);
  return 1 - smoothstep(d);
}

/* -------------------------------- entry point ---------------------------- */

function generateIconPng(size) {
  return createPng(size, iconPixel);
}

function generateIconSet(root) {
  const outputDir = path.join(root, "build");
  fs.mkdirSync(outputDir, { recursive: true });

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = sizes.map((size) => ({ size, data: generateIconPng(size) }));
  fs.writeFileSync(path.join(outputDir, "icon.ico"), createIco(pngs));
  fs.writeFileSync(path.join(outputDir, "icon.png"), generateIconPng(256));
}

/** Generate placeholder icons only if the user hasn't supplied their own. */
export function ensureIcons(root) {
  const icoPath = path.join(root, "build", "icon.ico");
  if (fs.existsSync(icoPath)) {
    console.log("build/icon.ico already exists — keeping your custom icon");
    return false;
  }
  generateIconSet(root);
  console.log("generated placeholder icons -> build/icon.ico, build/icon.png");
  return true;
}

/* Allow running directly: node scripts/generate-icons.mjs */
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  ensureIcons(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
}