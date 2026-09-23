import type { FirebaseOptions } from "firebase/app";

type EmulatorConfig = {
  enabled: boolean;
  authUrl: string;
  firestoreHost: string;
  firestorePort: number;
};

const RUNTIME_CONFIG_KEY = "studyos_firebase_config";

function getEnvValue(name: string): string {
  return import.meta.env[name]?.trim() ?? "";
}

function normalizeRuntimeConfig(value: unknown): Partial<FirebaseOptions> {
  if (!value || typeof value !== "object") return {};
  return {
    apiKey:
      typeof (value as Record<string, unknown>).apiKey === "string"
        ? String((value as Record<string, unknown>).apiKey)
        : "",
    authDomain:
      typeof (value as Record<string, unknown>).authDomain === "string"
        ? String((value as Record<string, unknown>).authDomain)
        : "",
    projectId:
      typeof (value as Record<string, unknown>).projectId === "string"
        ? String((value as Record<string, unknown>).projectId)
        : "",
    storageBucket:
      typeof (value as Record<string, unknown>).storageBucket === "string"
        ? String((value as Record<string, unknown>).storageBucket)
        : "",
    messagingSenderId:
      typeof (value as Record<string, unknown>).messagingSenderId === "string"
        ? String((value as Record<string, unknown>).messagingSenderId)
        : "",
    appId:
      typeof (value as Record<string, unknown>).appId === "string"
        ? String((value as Record<string, unknown>).appId)
        : "",
    measurementId:
      typeof (value as Record<string, unknown>).measurementId === "string"
        ? String((value as Record<string, unknown>).measurementId)
        : "",
  };
}

function readRuntimeConfig(): Partial<FirebaseOptions> {
  try {
    const raw = localStorage.getItem(RUNTIME_CONFIG_KEY);
    if (!raw) return {};
    return normalizeRuntimeConfig(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function ensureFirebaseConfigReady(): Promise<void> {
  if (hasFirebaseConfig()) return;

  try {
    const response = await fetch("./firebase-config.json", {
      cache: "no-store",
    });
    if (!response.ok) return;

    const json = await response.json();
    const config = normalizeRuntimeConfig(json);
    if (Object.values(config).some(Boolean)) {
      localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(config));
    }
  } catch {
    // The app will remain in safe demo mode until a valid Firebase config is available.
  }
}

export function hasFirebaseConfig(): boolean {
  const runtime = readRuntimeConfig();
  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;

  const hasEnvConfig = requiredKeys.some((key) => {
    const envName = {
      apiKey: "VITE_FIREBASE_API_KEY",
      authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
      projectId: "VITE_FIREBASE_PROJECT_ID",
      appId: "VITE_FIREBASE_APP_ID",
    }[key];
    return Boolean(getEnvValue(envName));
  });

  const hasRuntimeConfig = requiredKeys.every((key) => Boolean(runtime[key]));
  return hasEnvConfig || hasRuntimeConfig;
}

export function getFirebaseConfig(): FirebaseOptions {
  const runtime = readRuntimeConfig();
  const configFromEnv = {
    apiKey: getEnvValue("VITE_FIREBASE_API_KEY") || runtime.apiKey || "",
    authDomain:
      getEnvValue("VITE_FIREBASE_AUTH_DOMAIN") || runtime.authDomain || "",
    projectId:
      getEnvValue("VITE_FIREBASE_PROJECT_ID") || runtime.projectId || "",
    storageBucket:
      getEnvValue("VITE_FIREBASE_STORAGE_BUCKET") ||
      runtime.storageBucket ||
      "",
    messagingSenderId:
      getEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID") ||
      runtime.messagingSenderId ||
      "",
    appId: getEnvValue("VITE_FIREBASE_APP_ID") || runtime.appId || "",
    measurementId:
      getEnvValue("VITE_FIREBASE_MEASUREMENT_ID") ||
      runtime.measurementId ||
      "",
  };

  if (
    !configFromEnv.apiKey ||
    !configFromEnv.authDomain ||
    !configFromEnv.projectId ||
    !configFromEnv.appId
  ) {
    throw new Error(
      "Firebase is not configured. Add the project values to .env.local or include firebase-config.json in the packaged app.",
    );
  }

  return {
    apiKey: configFromEnv.apiKey,
    authDomain: configFromEnv.authDomain,
    projectId: configFromEnv.projectId,
    storageBucket: configFromEnv.storageBucket,
    messagingSenderId: configFromEnv.messagingSenderId,
    appId: configFromEnv.appId,
    measurementId: configFromEnv.measurementId,
  };
}

export function getFirebaseEmulatorConfig(): EmulatorConfig {
  const enabled = getEnvValue("VITE_FIREBASE_USE_EMULATOR") === "true";
  const authHost =
    getEnvValue("VITE_FIREBASE_EMULATOR_AUTH_HOST") || "127.0.0.1";
  const authPort = Number(
    getEnvValue("VITE_FIREBASE_EMULATOR_AUTH_PORT") || "9099",
  );
  const firestoreHost =
    getEnvValue("VITE_FIREBASE_EMULATOR_FIRESTORE_HOST") || "127.0.0.1";
  const firestorePort = Number(
    getEnvValue("VITE_FIREBASE_EMULATOR_FIRESTORE_PORT") || "8080",
  );

  if (
    !Number.isInteger(authPort) ||
    authPort <= 0 ||
    !Number.isInteger(firestorePort) ||
    firestorePort <= 0
  ) {
    throw new Error("Firebase emulator ports must be positive integers.");
  }

  return {
    enabled,
    authUrl: `http://${authHost}:${authPort}`,
    firestoreHost,
    firestorePort,
  };
}
