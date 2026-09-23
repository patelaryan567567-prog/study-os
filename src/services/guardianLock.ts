const KEY = "studyos_guardian_lock_v1";

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasGuardianLock() { return !!localStorage.getItem(KEY); }
export async function setGuardianPin(pin: string) {
  if (!/^\d{4,12}$/.test(pin)) throw new Error("Use a 4–12 digit guardian PIN.");
  localStorage.setItem(KEY, await digest(pin));
}
export async function verifyGuardianPin(pin: string) {
  const saved = localStorage.getItem(KEY);
  return !!saved && saved === await digest(pin);
}
