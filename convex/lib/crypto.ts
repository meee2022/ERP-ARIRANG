/**
 * Password hashing utility for Convex runtime.
 *
 * Uses Web Crypto API (crypto.subtle) — available in the Convex V8 runtime.
 * We do NOT use bcrypt because it requires native C bindings unavailable in serverless.
 *
 * Storage format: "<hex-salt>:<hex-sha256(salt+password)>"
 * The presence of ':' distinguishes hashed passwords from legacy plain-text ones.
 */

/** Convert an ArrayBuffer to a lowercase hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a random 16-byte hex salt */
function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

/**
 * Hash a password with SHA-256.
 * Returns an object with `hash` (full "salt:digest" string) and `salt`.
 */
export async function hashPassword(
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  const s = salt ?? generateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(s + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = bufToHex(digest);
  return { hash: `${s}:${hex}`, salt: s };
}

/**
 * Verify a password against a stored hash string "salt:digest".
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const colonIdx = storedHash.indexOf(":");
  if (colonIdx === -1) return false; // not a hashed password
  const salt = storedHash.slice(0, colonIdx);
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}
