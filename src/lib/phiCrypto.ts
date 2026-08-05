import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// AES-256-GCM field-level encryption for PHI free-text columns (visit notes,
// diagnosis, treatment plan). Key is derived once from AUTH_SECRET via scrypt
// so no extra secret needs provisioning; ciphertext is self-contained
// (iv + authTag + data) so it round-trips without external state.
const KEY = scryptSync(process.env.AUTH_SECRET ?? "dev-only-insecure-secret", "phi-field-salt", 32);
const PREFIX = "enc:v1:";

export function encryptPHI(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, data]).toString("base64");
}

export function decryptPHI(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // tolerate pre-encryption legacy rows
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function decryptPHIMaybe(value: string | null | undefined): string | null {
  return value == null ? null : decryptPHI(value);
}
