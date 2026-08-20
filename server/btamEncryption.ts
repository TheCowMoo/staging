/**
 * BTAM PII Encryption — AES-256-GCM
 * Encrypts sensitive subject/target fields before writing to the database.
 *
 * The key is derived from BTAM_ENCRYPTION_KEY when set (recommended), otherwise
 * from cookieSecret so existing deployments keep working. A dedicated key means
 * rotating JWT_SECRET/cookieSecret can never silently lock out encrypted BTAM
 * data (see DEPLOY_CHECKLIST.md — set BTAM_ENCRYPTION_KEY and re-encrypt rows).
 */
import crypto from "crypto";
import { ENV } from "./_core/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16;

// Known-default literal from the pre-hardening code — kept only so rows encrypted
// with the old dev default (in development) can still be decrypted.
const LEGACY_FALLBACK_SECRET = "fallback-dev-secret-do-not-use-in-prod";

// Key derivation versions. v1 = pre-hardening (single SHA-256), v2 = scrypt
// derivation added during hardening, v3 = current (dedicated BTAM key).
type KeyVersion = 1 | 2 | 3;
const KEY_SALTS: Record<KeyVersion, string> = {
  1: "",
  2: "fivestones-btam-key-v2",
  3: "fivestones-btam-key-v3",
};

// Current secret for NEW encryptions: the dedicated BTAM key if set, else
// cookieSecret (keeps deployments that haven't set the key working).
function getCurrentSecret(): string {
  return ENV.btamEncryptionKey ?? ENV.cookieSecret;
}

// Derive a 32-byte AES key. v3/v2 use scrypt (memory-hard); v1 is the legacy
// single SHA-256 derivation kept only to decrypt pre-hardening rows.
function deriveKey(secret: string, version: KeyVersion): Buffer {
  if (version >= 2) {
    return crypto.scryptSync(secret, KEY_SALTS[version], 32);
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded string:
 * <iv(12B)><tag(16B)><ciphertext> all base64-encoded together.
 */
export function encryptPII(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const key = deriveKey(getCurrentSecret(), 3);
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
  // Try every key derivation we have ever written, newest first, so data
  // survives secret migration:
  //   1. v3 scrypt(current)         — rows written after BTAM_ENCRYPTION_KEY was added
  //   2. v2 scrypt(current)         — hardening-window rows (current == cookieSecret when no BTAM key)
  //   3. v2 scrypt(cookieSecret)    — hardening-window rows after BTAM key was introduced
  //   4. v1 sha256(cookieSecret)    — pre-hardening rows
  //   5. v1 sha256(legacy default)  — old development rows
  return (
    tryDecrypt(deriveKey(getCurrentSecret(), 3)) ??
    tryDecrypt(deriveKey(getCurrentSecret(), 2)) ??
    tryDecrypt(deriveKey(ENV.cookieSecret, 2)) ??
    tryDecrypt(deriveKey(ENV.cookieSecret, 1)) ??
    tryDecrypt(deriveKey(LEGACY_FALLBACK_SECRET, 1))
  );
}
