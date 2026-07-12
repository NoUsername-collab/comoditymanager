import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SCRYPT_SALT = "zalmox-tenant-secrets-v1";

export class TenantVaultUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantVaultUnavailableError";
  }
}

export function getTenantSecretsMasterKey(): string | null {
  const fromEnv = process.env.TENANT_SECRETS_ENCRYPTION_KEY?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  if (process.env.NODE_ENV === "development") {
    return "dev-tenant-secrets-key-min-32-chars!!";
  }

  return null;
}

function deriveKey(masterSecret: string): Buffer {
  return scryptSync(masterSecret, SCRYPT_SALT, 32);
}

export function encryptTenantSecret(plaintext: string, masterSecret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(masterSecret);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptTenantSecret(ciphertext: string, masterSecret: string): string {
  const payload = Buffer.from(ciphertext, "base64");
  if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid tenant secret ciphertext");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const key = deriveKey(masterSecret);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

/** UI-safe mask — never exposes full API key. */
export function maskResendApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return "re_…";
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`;
}

export function isValidResendApiKey(apiKey: string): boolean {
  return /^re_[A-Za-z0-9_]+$/.test(apiKey.trim());
}
