// KOMPASSI - Admin Authentication
// Separate from tenant auth: uses an admin API key (env variable).
// Does NOT set RLS context, allowing cross-tenant queries for the dashboard.

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

/**
 * Validate the admin API key.
 * Unlike tenant auth, this does NOT set RLS context — admins
 * need visibility across all tenants for the dashboard.
 */
export function validateAdminKey(key: string | null): void {
  const ADMIN_KEY = process.env.ADMIN_API_KEY;

  if (!ADMIN_KEY) {
    throw new AdminAuthError(
      "ADMIN_API_KEY not configured. Set it in your .env file.",
      500
    );
  }

  if (!key || key.trim().length === 0) {
    throw new AdminAuthError(
      "Missing x-admin-key header.",
      401
    );
  }

  if (key.trim() !== ADMIN_KEY) {
    throw new AdminAuthError(
      "Invalid admin credentials.",
      401
    );
  }
}

/**
 * Wrapper for admin API routes. Validates the admin key and calls the handler.
 *
 * Usage:
 *   export const GET = withAdminAuth(async (request) => { ... });
 */
export function withAdminAuth<T>(
  handler: (request: Request) => Promise<T>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const adminKey = request.headers.get("x-admin-key");
      validateAdminKey(adminKey);
      return (await handler(request)) as Response;
    } catch (error) {
      if (error instanceof AdminAuthError) {
        return Response.json(
          { error: error.message },
          { status: error.status }
        );
      }
      console.error("Unexpected admin error:", error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
