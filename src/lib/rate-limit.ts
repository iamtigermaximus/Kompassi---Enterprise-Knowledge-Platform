// KOMPASSI - Rate Limiting
// Per-tenant rate limits based on plan tier: FREE, PRO, ENTERPRISE.
// Uses Upstash Redis for distributed rate limiting.

import { Ratelimit } from "@upstash/ratelimit";
import type { Tenant } from "@prisma/client";
import { getRedis } from "@/lib/redis";

// Limits per plan (queries per day)
export const PLAN_LIMITS: Record<string, number> = {
  FREE: 50,
  PRO: 1000,
  ENTERPRISE: 10000,
} as const;

// Duration: 24-hour rolling window
const WINDOW = "24 h" as const;

// Cache limiters by plan to avoid recreating them
const limiters = new Map<string, Ratelimit>();

function getLimiter(plan: string): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cached = limiters.get(plan);
  if (cached) return cached;

  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  const limiter = new Ratelimit({
    redis,
    analytics: true,
    prefix: `kompassi:ratelimit:${plan.toLowerCase()}`,
    limiter: Ratelimit.slidingWindow(limit, WINDOW),
  });

  limiters.set(plan, limiter);
  return limiter;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
}

/**
 * Check if the tenant has exceeded their rate limit.
 * Returns the result with limit/remaining/reset headers.
 *
 * Falls back to allowing the request if Redis is unavailable.
 */
export async function checkRateLimit(
  tenant: Tenant
): Promise<RateLimitResult> {
  const limiter = getLimiter(tenant.plan);

  if (!limiter) {
    // Redis not configured — allow every request but log a warning
    return {
      success: true,
      limit: PLAN_LIMITS[tenant.plan] ?? PLAN_LIMITS.FREE,
      remaining: -1, // -1 means "not tracked"
      reset: Date.now() + 86400000,
    };
  }

  try {
    const result = await limiter.limit(tenant.id);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open — don't block legitimate requests due to Redis errors
    return {
      success: true,
      limit: PLAN_LIMITS[tenant.plan] ?? PLAN_LIMITS.FREE,
      remaining: -1,
      reset: Date.now() + 86400000,
    };
  }
}

/**
 * Generate standard rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
