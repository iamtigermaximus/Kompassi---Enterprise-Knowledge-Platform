// KOMPASSI - API Key Generation
// Creates secure, prefixed API keys for tenant authentication.

import crypto from "crypto";

const KEY_PREFIX = "kp_";
const KEY_BYTES = 24; // 32-char base64url string after prefix

/**
 * Generate a new API key.
 * Format: kp_<32-char-base64url-random>
 * Example: kp_7x8fG3kLm9nQ2pRt5vYwBzCdEfGhIjKlMn
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(KEY_BYTES).toString("base64url");
  return `${KEY_PREFIX}${random}`;
}

/**
 * Validate the format of an API key.
 * Checks prefix and total length. Does NOT check against the database.
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length === KEY_PREFIX.length + Math.ceil((KEY_BYTES * 8) / 6); // base64url overhead
}
