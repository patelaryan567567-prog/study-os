/**
 * Native Google Sign-In for the Android/iOS (Capacitor) app.
 *
 * Why this exists:
 *   The web `signInWithPopup` flow cannot work inside the Capacitor WebView —
 *   after the user picks an account the OAuth handler redirects back to the
 *   app origin (`https://localhost`), which the OS browser can't hand back to
 *   the WebView, so the user is stuck on a white page and never signed in.
 *
 *   This module signs in with the native Google SDK
 *   (@capacitor-firebase/authentication) and then bridges the resulting OAuth
 *   credential into the web Firebase SDK (`signInWithCredential`), so the
 *   existing `onAuthStateChanged`, Firestore profile and persistence logic keep
 *   working unchanged.
 */
import { GoogleAuthProvider, signInWithCredential, type UserCredential } from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { getFirebaseInstances } from "./initFirebase";
import { isNative } from "@/native/capacitorBridge";

/** True when we run inside the app container with the native auth plugin. */
export function isNativeAuthAvailable(): boolean {
  if (!isNative()) return false;
  try {
    return Boolean((window as any).Capacitor?.Plugins?.FirebaseAuthentication);
  } catch {
    return false;
  }
}

/**
 * Native Google sign-in. Resolves with a normal Firebase web `UserCredential`
 * so the rest of the app (auth state, Firestore profile, settings sync) works
 * exactly like a web sign-in.
 */
export async function signInWithGoogleNative(): Promise<UserCredential> {
  // Keep this explicit so a stale generated Capacitor config cannot split the
  // native and JavaScript Firebase sessions during development.
  const result = await FirebaseAuthentication.signInWithGoogle({
    skipNativeAuth: true,
  });

  const credential = result.credential;
  if (!credential?.idToken) {
    throw new Error(
      "Google sign-in did not return a valid session. Please try again.",
    );
  }

  const authCredential = GoogleAuthProvider.credential(
    credential.idToken,
    credential.accessToken,
  );

  return signInWithCredential(getFirebaseInstances().auth, authCredential);
}
