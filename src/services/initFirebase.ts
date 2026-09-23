import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  getFirebaseConfig,
  getFirebaseEmulatorConfig,
  hasFirebaseConfig,
} from "./firebaseConfig";

export type FirebaseInstances = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let instances: FirebaseInstances | null = null;

export function initializeFirebase(): FirebaseInstances {
  if (instances) return instances;

  if (!hasFirebaseConfig()) {
    throw new Error(
      "Firebase is not configured. Add your Firebase values to .env.local or provide them in the packaged config.",
    );
  }

  const config = getFirebaseConfig();
  const app = getApps().length > 0 ? getApp() : initializeApp(config);

  let auth: Auth;
  try {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    auth = getAuth(app);
  }

  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = getFirestore(app);
  }

  const emulator = getFirebaseEmulatorConfig();

  if (emulator.enabled) {
    connectAuthEmulator(auth, emulator.authUrl, { disableWarnings: true });
    connectFirestoreEmulator(
      db,
      emulator.firestoreHost,
      emulator.firestorePort,
    );
  }

  instances = { app, auth, db };
  return instances;
}

export function getFirebaseInstances(): FirebaseInstances {
  return instances ?? initializeFirebase();
}
