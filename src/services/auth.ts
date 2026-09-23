import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged as observeFirebaseAuthState,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as signOutOfFirebase,
  updateProfile,
  type User as FirebaseUser,
  type UserCredential,
  type Unsubscribe,
} from "firebase/auth";
import { getFirebaseInstances } from "./initFirebase";
import { isNative } from "@/native/capacitorBridge";
import { isElectron } from "@/native/externalBrowser";

export type User = FirebaseUser | null;

function getAuthService() {
  return getFirebaseInstances().auth;
}

function requireCredentials(email: string, password: string): void {
  if (!email.trim()) throw new Error("Email is required.");
  if (!password) throw new Error("Password is required.");
}

/** Human-readable, actionable messages for the auth error codes users
 *  actually hit. Shared by the login page and the redirect-completion path. */
export function friendlyAuthError(cause: unknown): string {
  const code = (cause as { code?: string })?.code ?? "";
  const host = typeof window !== "undefined" ? window.location.host : "this domain";

  const messages: Record<string, string> = {
    "auth/unauthorized-domain":
      `Sign-in is blocked for this app address. Open Firebase Console â†’ Authentication â†’ Settings â†’ Authorized domains and add "${host}".`,
    "auth/operation-not-supported-in-this-environment":
      "Google sign-in is not supported in this environment. Try the email sign-in or open the app in a normal browser tab.",
    "auth/popup-blocked":
      "The Google sign-in popup was blocked by the browser. Allow popups for this site and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled. Please try again.",
    "auth/argument-error":
      "Firebase Auth configuration is invalid. Check Google/Email sign-in is enabled and the authorized domains include this app's address.",
    "auth/configuration-not-found":
      "Firebase project configuration is missing. Recheck your Firebase API key, project ID, and auth domain.",
    "auth/network-request-failed":
      "The connection to Firebase failed. Please check your internet connection and Firebase project status.",
  };

  const message = cause instanceof Error ? cause.message : "";
  return messages[code] ?? message ?? "Google sign-in failed. Please try again.";
}

export async function signInWithGooglePopup(): Promise<UserCredential | void> {
  // Inside the Android/iOS app the browser popup can never return to the
  // WebView (white page after picking an account). Use the native Google SDK
  // and bridge the credential into the web SDK instead.
  if (isNative()) {
    const { signInWithGoogleNative } = await import("@/services/authAndroid");
    return signInWithGoogleNative();
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

// Electron desktop:the Firebase auth popup opens inside the app window (see
  // electron/main.ts), so the normal popup + postMessage flow hands the signed-in
  // user straight back to this window. The in-window redirect flow was the previous
  // approach, but Chrome/Electron third-party storage blocking breaks the cross-origin
  // authDomain iframe it needs, leaving users stuck on the login page after Google.

 
  if (isElectron()) {
    return await signInWithPopup(getAuthService(), provider);
  }

  try {
    return await signInWithPopup(getAuthService(), provider);
  } catch (cause) {
    // Popups are blocked or unsupported in some browsers/embedded views â€” the
    // redirect flow is the reliable fallback and lands back on the app.
    const code = (cause as { code?: string })?.code ?? "";
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(getAuthService(), provider);
      return undefined;
    }
    throw cause;
  }
}

/** Completes a pending browser-redirect sign-in (used on Electron startup).
 *  Returns a friendly error message when a redirect came back but FAILED â€”
 *  silently swallowing it left users on the login page with no explanation
 *  (e.g. when the app's domain is not in Firebase authorized domains). */
export async function completeGoogleRedirectSignIn(): Promise<string | null> {
  try {
    await getRedirectResult(getFirebaseInstances().auth);
    return null;
  } catch (cause) {
    const code = (cause as { code?: string })?.code ?? "";
    // "No pending redirect" is the normal case on every startup â€” not an error.
    if (!code || code === "auth/no-auth-event") return null;
    console.error("[auth] Google redirect sign-in failed:", cause);
    return friendlyAuthError(cause);
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  requireCredentials(email, password);
  return createUserWithEmailAndPassword(
    getAuthService(),
    email.trim(),
    password,
  );
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  requireCredentials(email, password);
  return signInWithEmailAndPassword(getAuthService(), email.trim(), password);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim()) throw new Error("Email is required.");
  await sendPasswordResetEmail(getAuthService(), email.trim());
}

export async function signOut(): Promise<void> {
  await signOutOfFirebase(getAuthService());
}

export async function updateDisplayName(displayName: string): Promise<void> {
  const user = getAuthService().currentUser;
  const name = displayName.trim();

  if (!user) throw new Error("You must be signed in to update your profile.");
  if (!name) throw new Error("Display name is required.");

  await updateProfile(user, { displayName: name });
}

export function onAuthStateChanged(
  callback: (user: User) => void,
): Unsubscribe {
  return observeFirebaseAuthState(getAuthService(), callback);
}

export function getCurrentUser(): User {
  return getAuthService().currentUser;
}
