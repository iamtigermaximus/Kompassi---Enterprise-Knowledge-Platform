// KOMPASSI - Authentication Helper
// Validates x-api-key header, looks up the tenant, and sets tenant context for RLS.

import { prisma } from "@/lib/prisma";
import type { Tenant } from "@prisma/client";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Validate the API key and return the tenant.
 * Sets `app.current_tenant_id` in PostgreSQL for Row-Level Security.
 *
 * Call this at the top of every authenticated API route handler.
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
 * Express-style wrapper: validates the API key and calls the handler with tenant context.
 *
 * Usage:
 *   export const GET = withAuth(async (request, tenant) => { ... });
 */
export function withAuth<T>(
  handler: (request: Request, tenant: Tenant) => Promise<T>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const apiKey = request.headers.get("x-api-key");
      const tenant = await validateApiKey(apiKey);
      return await handler(request, tenant) as Response;
    } catch (error) {
      if (error instanceof AuthError) {
        return Response.json(
          { error: error.message },
          { status: error.status }
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
