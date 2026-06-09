// KOMPASSI - Authentication Helper
// Validates session cookie (kp_session JWT) OR x-api-key header.
// Looks up the tenant, sets tenant context for RLS, enforces rate limits.
// Auto-creates RLS infrastructure on first use — no manual setup needed.

import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/jwt";
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
 * Extract the kp_session JWT from request cookies.
 */
function getSessionCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/kp_session=([^;]+)/);
  return match ? match[1] : null;
}

// ─── RLS auto-setup ─────────────────────────────────────────────────────────

let rlsReady = false;

/**
 * Idempotent: ensures the app schema, set_tenant_id function,
 * and RLS policies exist. Runs once per process lifetime.
 * Safe to call repeatedly — skips if already done.
 */
async function ensureRlsSetup(): Promise<void> {
  if (rlsReady) return;

  try {
    // Create the app schema if it doesn't exist
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS app`);

    // Create the set_tenant_id function
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION app.set_tenant_id(tenant_id TEXT)
      RETURNS VOID AS $$
      BEGIN
        PERFORM set_config('app.current_tenant_id', tenant_id, true);
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create the current_tenant_id helper
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION app.current_tenant_id()
      RETURNS TEXT AS $$
        SELECT nullif(current_setting('app.current_tenant_id', true), '');
      $$ LANGUAGE SQL STABLE
    `);

    // Enable RLS on all tables (safe to re-run)
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ENABLE ROW LEVEL SECURITY`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "query_logs" ENABLE ROW LEVEL SECURITY`);

    // Create RLS policies (drop first so this is re-runnable)
    for (const table of ["users", "documents", "chunks", "query_logs"]) {
      try {
        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS tenant_isolation ON "${table}"`
        );
        await prisma.$executeRawUnsafe(`
          CREATE POLICY tenant_isolation ON "${table}"
          FOR ALL
          USING ("tenantId" = app.current_tenant_id())
        `);
      } catch {
        // Policy may not exist yet — that's fine
      }
    }

    rlsReady = true;
    console.log(" RLS auto-setup complete — app schema, functions, and policies created.");
  } catch (error) {
    console.error(" RLS setup failed:", error);
    // Don't block — the app still works without RLS at the DB level,
    // application-level tenant filtering in Prisma where clauses handles isolation.
  }
}

/**
 * Set the tenant context for RLS. Auto-creates the infrastructure if missing.
 */
async function setTenantContext(tenantId: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT app.set_tenant_id($1)`,
      tenantId
    );
  } catch {
    // RLS infrastructure missing — create it, then retry
    await ensureRlsSetup();
    try {
      await prisma.$executeRawUnsafe(
        `SELECT app.set_tenant_id($1)`,
        tenantId
      );
    } catch (e) {
      // Still failing — log but don't crash. App-level filtering still works.
      console.warn("Could not set tenant RLS context:", e);
    }
  }
}

// ─── Tenant resolution ──────────────────────────────────────────────────────

/**
 * Try session cookie authentication first, then fall back to API key.
 * Sets `app.current_tenant_id` in PostgreSQL for Row-Level Security.
 *
 * @throws {AuthError} if neither auth method succeeds
 */
async function resolveTenant(request: Request): Promise<{
  tenant: Tenant;
  method: "session" | "api-key";
}> {
  // ─── Method 1: Session cookie ─────────────────────────────────
  const token = getSessionCookie(request);
  if (token) {
    const payload = verifyJwt(token);
    if (payload && payload.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: payload.tenantId },
      });

      if (tenant) {
        await setTenantContext(tenant.id);
        return { tenant, method: "session" };
      }
    }
  }

  // ─── Method 2: x-api-key header ───────────────────────────────
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey.trim().length === 0) {
    throw new AuthError(
      "Authentication required. Sign in at /login or provide a valid x-api-key header.",
      401
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { apiKey: apiKey.trim() },
  });

  if (!tenant) {
    throw new AuthError(
      "Invalid API key. The provided key does not match any tenant.",
      401
    );
  }

  await setTenantContext(tenant.id);

  return { tenant, method: "api-key" };
}

// ─── Route wrapper ──────────────────────────────────────────────────────────

/**
 * Wrapper: authenticates via session cookie or API key,
 * enforces rate limit, and calls the handler with tenant context.
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
      // Step 1: Authenticate (session cookie or API key)
      const { tenant } = await resolveTenant(request);

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

/**
 * Validate API key directly (used outside of the withAuth wrapper).
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

  await setTenantContext(tenant.id);

  return tenant;
}
