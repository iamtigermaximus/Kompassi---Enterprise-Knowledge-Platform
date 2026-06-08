// KOMPASSI - Authentication Helper
// Validates x-api-key header, looks up the tenant, sets tenant context for RLS,
// and enforces per-tenant rate limits.

import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import type { RateLimitResult } from "@/lib/rate-limit";
import type { Tenant } from "@prisma/client";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export class RateLimitError extends Error {
  status: number;
  headers: Record<string, string>;

  constructor(result: RateLimitResult) {
    super("Rate limit exceeded. Try again after the reset timestamp.");
    this.name = "RateLimitError";
    this.status = 429;
    this.headers = rateLimitHeaders(result);
  }
}

/**
 * Validate the API key and return the tenant.
 * Sets `app.current_tenant_id` in PostgreSQL for Row-Level Security.
 *
 * @throws {AuthError} if the API key is missing or invalid
 */
export async function validateApiKey(apiKey: string | null): Promise<Tenant> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new AuthError("Missing x-api-key header. Provide a valid API key.", 401);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { apiKey: apiKey.trim() },
  });

  if (!tenant) {
    throw new AuthError("Invalid API key. The provided key does not match any tenant.", 401);
  }

  // Set the tenant context for PostgreSQL Row-Level Security.
  // After this call, all subsequent Prisma queries on this connection
  // are automatically filtered by the RLS tenant_isolation policies.
  await prisma.$executeRawUnsafe(
    `SELECT app.set_tenant_id($1)`,
    tenant.id
  );

  return tenant;
}

/**
 * Express-style wrapper: validates API key, enforces rate limit,
 * and calls the handler with tenant context.
 *
 * Rate limit headers (X-RateLimit-*) are injected into every response.
 *
 * Usage:
 *   export const GET = withAuth(async (request, tenant) => { ... });
 */
export function withAuth<T>(
  handler: (request: Request, tenant: Tenant) => Promise<T>
) {
  return async (request: Request): Promise<Response> => {
    try {
      // Step 1: Authenticate
      const apiKey = request.headers.get("x-api-key");
      const tenant = await validateApiKey(apiKey);

      // Step 2: Check rate limit
      const rateLimitResult = await checkRateLimit(tenant);

      if (!rateLimitResult.success) {
        return Response.json(
          {
            error: "Rate limit exceeded. Try again after the reset timestamp.",
            plan: tenant.plan,
          },
          {
            status: 429,
            headers: rateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Step 3: Execute handler
      const response = await handler(request, tenant);
      const responseObj = response as Response;

      // Step 4: Inject rate limit headers into the response
      const headers = rateLimitHeaders(rateLimitResult);
      for (const [key, value] of Object.entries(headers)) {
        responseObj.headers.set(key, value);
      }

      return responseObj;
    } catch (error) {
      if (error instanceof AuthError) {
        return Response.json(
          { error: error.message },
          { status: error.status }
        );
      }
      if (error instanceof RateLimitError) {
        return Response.json(
          { error: error.message },
          { status: error.status, headers: error.headers }
        );
      }
      console.error("Unexpected auth error:", error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
