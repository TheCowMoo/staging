/**
 * BTAM PII Encryption — AES-256-GCM
 * Encrypts sensitive subject/target fields before writing to the database.
 * The encryption key is derived from JWT_SECRET so no additional secret is needed.
 */
import crypto from "crypto";
import { ENV } from "./_core/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16;

// Known-default literal from the pre-hardening code — kept only so rows encrypted
// with the old dev default (in development) can still be decrypted.
const LEGACY_FALLBACK_SECRET = "fallback-dev-secret-do-not-use-in-prod";

function getSecret(): string {
  // In production ENV.cookieSecret is fail-closed (env.ts refuses to start without
  // a real JWT_SECRET), so there is no known-default fallback for new encryptions.
  return ENV.cookieSecret;
}

// Derive a 32-byte AES key from the secret using scrypt (memory-hard). The old
// single SHA-256 derivation is kept only as a fallback for decrypting rows that
// were encrypted before this change.
function deriveKey(secret: string, useScrypt: boolean): Buffer {
  if (useScrypt) {
    return crypto.scryptSync(secret, "fivestones-btam-key-v2", 32);
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded string:
 * <iv(12B)><tag(16B)><ciphertext> all base64-encoded together.
 */
export function encryptPII(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const key = deriveKey(getSecret(), true);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Combine iv + tag + ciphertext into one base64 blob
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a base64-encoded ciphertext produced by encryptPII.
 * Returns null if the input is null/undefined or decryption fails.
 */
export function decryptPII(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  const secret = getSecret();
  const buf = Buffer.from(ciphertext, "base64");
  const tryDecrypt = (key: Buffer): string | null => {
    try {
      const iv = buf.subarray(0, IV_LENGTH);
      const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(encrypted) + decipher.final("utf8");
    } catch {
      return null;
    }
  };
  // Try the current scrypt-derived key, then fall back to the legacy SHA-256 key
  // so rows encrypted before the upgrade still decrypt.
  return (
    tryDecrypt(deriveKey(secret, true)) ??
    tryDecrypt(deriveKey(secret, false)) ??
    tryDecrypt(deriveKey(LEGACY_FALLBACK_SECRET, false))
  );
}
