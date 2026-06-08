// KOMPASSI - POST /api/auth/logout
// Clears the session cookie.

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("kp_session");
  return response;
}
