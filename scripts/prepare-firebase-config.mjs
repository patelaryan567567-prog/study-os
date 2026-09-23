import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envFilePath = path.join(rootDir, ".env.local");
const outputPath = path.join(rootDir, "public", "firebase-config.json");

const firebaseKeyNames = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, "utf8");
  const parsed = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rest.join("=").trim();
    parsed[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return parsed;
}

function getValue(key) {
  const fromFile = parseEnvFile(envFilePath)[key];
  if (fromFile) return fromFile;
  return process.env[key] || "";
}

const config = {
  apiKey: getValue("VITE_FIREBASE_API_KEY"),
  authDomain: getValue("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getValue("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getValue("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getValue("VITE_FIREBASE_APP_ID"),
  measurementId: getValue("VITE_FIREBASE_MEASUREMENT_ID"),
};

const hasRequiredValue = firebaseKeyNames.every((key) =>
  Boolean(getValue(key)),
);

if (!hasRequiredValue) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({}, null, 2) + "\n", "utf8");
  console.warn(
    "Firebase runtime config file created without credentials; app will stay in safe fallback mode until .env.local is populated.",
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2) + "\n", "utf8");
console.log(
  `Firebase runtime config written to ${path.relative(rootDir, outputPath)}`,
);
