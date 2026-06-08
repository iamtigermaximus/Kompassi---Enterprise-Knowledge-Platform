// KOMPASSI - Next.js Proxy
// First line of defense: validates that x-api-key header is present on /api/* routes.
// Full database validation is performed inside each API route via `validateApiKey()`.
//
// Note: "proxy" replaces "middleware" as of Next.js 16.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// API key format: kp_<32-char-base64url>
const KEY_PREFIX = "kp_";
const MIN_KEY_LENGTH = KEY_PREFIX.length + 32;

/**
 * Routes that do NOT require authentication.
 */
const PUBLIC_ROUTES = ["/api/health", "/api/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const apiKey = request.headers.get("x-api-key");

  // Check presence
  if (!apiKey || apiKey.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing x-api-key header. Provide a valid API key." },
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
