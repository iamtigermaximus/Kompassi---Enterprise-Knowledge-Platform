// KOMPASSI - GET /api/auth/session
// Returns current user from the session cookie.

import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/kp_session=([^;]+)/);
  const token = match?.[1];

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const payload = verifyJwt(token);
  if (!payload) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    response.cookies.delete("kp_session");
    return response;
  }

  return NextResponse.json({
    user: {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenantId: payload.tenantId ?? null,
    },
  });
}
