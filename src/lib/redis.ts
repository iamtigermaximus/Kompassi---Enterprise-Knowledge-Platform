// KOMPASSI - Upstash Redis Client
// Singleton Redis connection for rate limiting and caching.

import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

let redisClient: Redis | null = null;

/**
 * Get the Upstash Redis client.
 * Returns null if Redis is not configured, allowing the app
 * to fall back gracefully (rate limiting skipped, app still works).
 */
export function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn(
      "⚠ UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not set. Rate limiting disabled."
    );
    return null;
  }

  redisClient = new Redis({
    url: REDIS_URL,
    token: REDIS_TOKEN,
  });

  return redisClient;
}
