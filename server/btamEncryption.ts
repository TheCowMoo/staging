/**
 * BTAM PII Encryption — AES-256-GCM
 * Encrypts sensitive subject/target fields before writing to the database.
 * The encryption key is derived from JWT_SECRET so no additional secret is needed.
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? "fallback-dev-secret-do-not-use-in-prod";
  // Derive a 32-byte key from the JWT_SECRET using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded string:
 * <iv(12B)><tag(16B)><ciphertext> all base64-encoded together.
 */
export function encryptPII(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const key = getKey();
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
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return null;
  }
}
