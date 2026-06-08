// KOMPASSI - GET /api/admin/usage
// Query counts grouped by day for the usage chart (last 30 days).
// Auth: x-admin-key header

import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";

interface UsageRow {
  day: string; // "2026-06-08"
  count: string; // PostgreSQL returns BIGINT as string
}

interface DailyUsage {
  day: string;
  count: number;
}

export const GET = withAdminAuth(async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Raw SQL for grouping by day
  const rows = await prisma.$queryRaw<UsageRow[]>`
    SELECT
      DATE("timestamp") AS day,
      COUNT(*)::text AS count
    FROM query_logs
    WHERE "timestamp" >= ${thirtyDaysAgo}
    GROUP BY DATE("timestamp")
    ORDER BY day ASC
  `;

  // Fill in missing days with 0 count
  const data: DailyUsage[] = [];
  const start = new Date(thirtyDaysAgo);
  const today = new Date();

  for (
    let d = new Date(start);
    d <= today;
    d.setDate(d.getDate() + 1)
  ) {
    const dayStr = d.toISOString().slice(0, 10);
    const match = rows.find((r) => r.day === dayStr);
    data.push({
      day: dayStr,
      count: match ? parseInt(match.count, 10) : 0,
    });
  }

  return Response.json({ data });
});
