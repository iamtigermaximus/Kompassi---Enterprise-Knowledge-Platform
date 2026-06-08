// KOMPASSI - GET /api/admin/metrics
// Aggregated dashboard metrics across all tenants.
// Auth: x-admin-key header

import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";

export const GET = withAdminAuth(async () => {
  // Total query count
  const totalQueries = await prisma.queryLog.count();

  // Total cost (sum of all query costs)
  const costResult = await prisma.queryLog.aggregate({
    _sum: { cost: true },
  });
  const totalCost = costResult._sum.cost ?? 0;

  // Average latency
  const latencyResult = await prisma.queryLog.aggregate({
    _avg: { latency: true },
  });
  const avgLatency = Math.round(latencyResult._avg.latency ?? 0);

  // Total tenants per plan
  const tenantsByPlan = await prisma.tenant.groupBy({
    by: ["plan"],
    _count: { id: true },
  });

  const tenants = {
    FREE: 0,
    PRO: 0,
    ENTERPRISE: 0,
    total: 0,
  };

  for (const group of tenantsByPlan) {
    tenants[group.plan as keyof typeof tenants] = group._count.id;
    tenants.total += group._count.id;
  }

  // Popular searches (top 5 queries by count)
  const popularSearches = await prisma.queryLog.groupBy({
    by: ["query"],
    _count: { query: true },
    orderBy: { _count: { query: "desc" } },
    take: 5,
  });

  // Queries in last 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const queries24h = await prisma.queryLog.count({
    where: { timestamp: { gte: last24h } },
  });

  return Response.json({
    queries: {
      total: totalQueries,
      last24h: queries24h,
    },
    cost: {
      total: Math.round(totalCost * 10000) / 10000,
    },
    latency: {
      avg: avgLatency,
    },
    tenants,
    popularSearches: popularSearches.map((s) => ({
      query: s.query,
      count: s._count.query,
    })),
  });
});
