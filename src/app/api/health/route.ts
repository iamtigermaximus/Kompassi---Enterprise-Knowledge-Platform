// KOMPASSI - GET /api/health
// Public health check endpoint. Does NOT require authentication.

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: "connected",
      },
    });
  } catch {
    return Response.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        services: {
          database: "disconnected",
        },
      },
      { status: 503 }
    );
  }
}
