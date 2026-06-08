// KOMPASSI - GET /api/admin/tenants
// List all tenants with usage stats for the admin dashboard.
// Auth: x-admin-key header

import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";

export const GET = withAdminAuth(async () => {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      queriesPerDay: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          documents: true,
          queryLogs: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get cost per tenant in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const costRows = await prisma.queryLog.groupBy({
    by: ["tenantId"],
    _sum: { cost: true },
    _count: { id: true },
    where: {
      timestamp: { gte: thirtyDaysAgo },
    },
  });

  const costByTenant = new Map<string, { cost: number; queries: number }>();
  for (const row of costRows) {
    costByTenant.set(row.tenantId, {
      cost: row._sum.cost ?? 0,
      queries: row._count.id,
    });
  }

  const result = tenants.map((t) => {
    const usage = costByTenant.get(t.id);
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      queriesPerDay: t.queriesPerDay,
      users: t._count.users,
      documents: t._count.documents,
      totalQueries: t._count.queryLogs,
      recentQueries: usage?.queries ?? 0,
      recentCost: Math.round((usage?.cost ?? 0) * 10000) / 10000,
      createdAt: t.createdAt,
    };
  });

  return Response.json({ tenants: result });
});
