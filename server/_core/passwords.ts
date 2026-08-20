/**
 * Password hashing — memory-hard KDF via Node's built-in crypto.scrypt.
 *
 * Replaces the previous single-pass SHA-256(salt + password) scheme, which is
 * trivially brute-forceable on GPU hardware. New hashes use:
 *   scrypt$<N>$<saltHex>$<derivedHex(64 bytes)>
 * Legacy SHA-256 hashes are still verified so existing users can log in, and
 * are transparently re-hashed with scrypt on their next successful login.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";

const SCRYPT_PREFIX = "scrypt$";
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384; // CPU/memory cost (2^14) — OWASP-recommended range for scrypt

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N }).toString("hex");
  return { hash: `${SCRYPT_PREFIX}${SCRYPT_N}$${salt}$${derived}`, salt };
}

/** Verify a password against either the new scrypt format or the legacy SHA-256 format. */
export function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
  storedSalt: string | null | undefined
): boolean {
  if (!password || !storedHash || !storedSalt) return false;
  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    try {
      const [, n, salt, hash] = storedHash.split("$");
      const derived = scryptSync(password, salt, SCRYPT_KEYLEN, { N: Number(n) }).toString("hex");
      return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
    } catch {
      return false;
    }
  }
  // Legacy: sha256(salt + password) — verified only so existing users can still log in.
  const legacy = createHash("sha256").update(storedSalt + password).digest("hex");
  return timingSafeEqual(Buffer.from(legacy, "hex"), Buffer.from(storedHash, "hex"));
}

/** True when the stored hash uses the legacy SHA-256 scheme and should be upgraded. */
export function needsRehash(storedHash: string | null | undefined): boolean {
  return !!storedHash && !storedHash.startsWith(SCRYPT_PREFIX);
}
