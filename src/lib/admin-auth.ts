// KOMPASSI - Admin Authentication (Session-based)
// Admin API routes validate the kp_session cookie (JWT).
// Does NOT set RLS context — admins see across all tenants.

import { verifyJwt } from "@/lib/jwt";

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

/**
 * Extract and validate the session cookie from the request.
 */
function getSession(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/kp_session=([^;]+)/);
  if (!match) return null;
  return verifyJwt(match[1]);
}

/**
 * Wrapper for admin API routes. Validates the session cookie.
 *
 * Usage:
 *   export const GET = withAdminAuth(async (request) => { ... });
 */
export function withAdminAuth<T>(
  handler: (request: Request) => Promise<T>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const session = getSession(request);
      if (!session) {
        return Response.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }
      return (await handler(request)) as Response;
    } catch (error) {
      if (error instanceof AdminAuthError) {
        return Response.json(
          { error: error.message },
          { status: error.status }
        );
      }
      console.error("Admin error:", error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
