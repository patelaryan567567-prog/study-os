import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
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
import { getFirebaseConfig, getFirebaseEmulatorConfig } from "./firebaseConfig";
import { logError } from "@/utils/errors";

export type FirebaseInstances = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let instances: FirebaseInstances | null = null;

export function initializeFirebase(): FirebaseInstances {
  if (instances) return instances;

  const config = getFirebaseConfig();
  const app = getApps().length > 0 ? getApp() : initializeApp(config);

  let auth: Auth;
  try {
    auth = initializeAuth(app, { persistence: browserLocalPersistence });
  } catch (error) {
    logError("Falling back to the default Firebase auth instance", error);
    auth = getAuth(app);
  }

  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    logError("Falling back to Firestore without offline persistence", error);
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
