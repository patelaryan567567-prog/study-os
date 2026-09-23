// Regenerates build/icon.png (1024) and build/icon.ico from build/icon.svg
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svgPath = path.join(root, "build", "icon.svg");
const svg = fs.readFileSync(svgPath);

const pngPath = path.join(root, "build", "icon.png");
await sharp(svg, { density: 96 }).resize(1024, 1024).png().toFile(pngPath);
console.log("wrote", pngPath);

const sizes = [16, 24, 32, 48, 64, 128, 256];
const buffers = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 96 }).resize(s, s).png().toBuffer())
);
const icoPath = path.join(root, "build", "icon.ico");
fs.writeFileSync(icoPath, await pngToIco(buffers));
console.log("wrote", icoPath);
