// KOMPASSI - POST /api/auth/login
// Accepts email + password, returns session cookie.

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signJwt } from "@/lib/jwt";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
    });

    const response = NextResponse.json({
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    });

    response.cookies.set("kp_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 3600, // 8 hours
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
