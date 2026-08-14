import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged as observeFirebaseAuthState,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as signOutOfFirebase,
  updateProfile,
  type User as FirebaseUser,
  type UserCredential,
  type Unsubscribe,
} from "firebase/auth";
import { getFirebaseInstances } from "./initFirebase";

export type User = FirebaseUser | null;

function getAuthService() {
  return getFirebaseInstances().auth;
}

function requireCredentials(email: string, password: string): void {
  if (!email.trim()) throw new Error("Email is required.");
  if (!password) throw new Error("Password is required.");
}

export async function signInWithGooglePopup(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(getAuthService(), provider);
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
  onError?: (error: Error) => void,
): Unsubscribe {
  return observeFirebaseAuthState(getAuthService(), callback, onError);
}

export function getCurrentUser(): User {
  return getAuthService().currentUser;
}
