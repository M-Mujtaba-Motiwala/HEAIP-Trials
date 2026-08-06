// =============================================================================
// Cryptographic Utilities — Hamdard AI Platform
// -----------------------------------------------------------------------------
// Single source of truth for API key encryption/decryption and provider config.
// All credential-related code must import from here.
// =============================================================================

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): crypto.CipherKey {
  const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY environment variable must be set to a 32+ character secret. " +
      "Generate one with: openssl rand -hex 32"
    );
  }
  return crypto.scryptSync(ENCRYPTION_KEY, "hamdard-salt", 32);
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, tagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskKey(apiKey: string): string {
  if (apiKey.length <= 8) return "****";
  return apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
}

// ─── Provider Base URLs ───────────────────────────────────────────────────────

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  azure: "https://your-resource.openai.azure.com",
  ollama: "http://localhost:11434/v1",
  huggingface: "https://api-inference.huggingface.co/v1",
  together: "https://api.together.xyz/v1",
  custom: "",
};

export function getProviderBaseUrl(provider: string, credentialBaseUrl?: string | null): string {
  return credentialBaseUrl || PROVIDER_BASE_URLS[provider] || "";
}
