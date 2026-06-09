// KOMPASSI - Next.js Proxy
// First line of defense: checks x-api-key header OR session cookie on /api/* routes.
// Full validation is performed inside each API route.
//
// Note: "proxy" replaces "middleware" as of Next.js 16.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// API key format: kp_<32-char-base64url>
const KEY_PREFIX = "kp_";
const MIN_KEY_LENGTH = KEY_PREFIX.length + 32;

/**
 * Routes that do NOT require any authentication.
 */
const PUBLIC_ROUTES = ["/api/health", "/api/admin", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip public routes entirely (health, admin auth, auth flows)
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie (logged-in tenant users)
  const cookies = request.headers.get("cookie") || "";
  const hasSession = /kp_session=([^;]+)/.test(cookies);

  if (hasSession) {
    // Session validated in the route handler — let through
    return NextResponse.next();
  }

  // Fall back to x-api-key (programmatic access)
  const apiKey = request.headers.get("x-api-key");

  // Check presence
  if (!apiKey || apiKey.trim().length === 0) {
    return NextResponse.json(
      { error: "Authentication required. Sign in at /login or provide a valid x-api-key header." },
      {
        status: 401,
        headers: {
          "X-RateLimit-Limit": "0",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Check format (quick validation, full DB lookup happens in route handler)
  if (!apiKey.startsWith(KEY_PREFIX) || apiKey.length < MIN_KEY_LENGTH) {
    return NextResponse.json(
      { error: "Invalid API key format." },
      { status: 401 }
    );
  }

  // Pass through — actual tenant validation happens in the API route via validateApiKey()
  return NextResponse.next();
}

/**
 * Configure which paths the proxy runs on.
 */
export const config = {
  matcher: ["/api/:path*"],
};
