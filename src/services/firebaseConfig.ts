import type { FirebaseOptions } from "firebase/app";

type EmulatorConfig = {
  enabled: boolean;
  authUrl: string;
  firestoreHost: string;
  firestorePort: number;
};

const REQUIRED_FIREBASE_ENV = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

function getEnvValue(name: string): string {
  return import.meta.env[name]?.trim() ?? "";
}

export function getFirebaseConfig(): FirebaseOptions {
  const missing = REQUIRED_FIREBASE_ENV.filter((name) => !getEnvValue(name));

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Add ${missing.join(", ")} to .env.local. ` +
        "Use .env.local.example as the template.",
    );
  }

  return {
    apiKey: getEnvValue("VITE_FIREBASE_API_KEY"),
    authDomain: getEnvValue("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: getEnvValue("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: getEnvValue("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnvValue("VITE_FIREBASE_APP_ID"),
    measurementId: getEnvValue("VITE_FIREBASE_MEASUREMENT_ID"),
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
