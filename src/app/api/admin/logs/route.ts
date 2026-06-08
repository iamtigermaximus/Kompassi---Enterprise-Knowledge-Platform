// KOMPASSI - GET /api/admin/logs
// Paginated audit log viewer for admin dashboard.
// Query params: ?page=1&limit=20&tenantId=xxx&search=keyword&from=date&to=date
// Auth: x-admin-key header

import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-auth";

export const GET = withAdminAuth(async (request) => {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const tenantId = url.searchParams.get("tenantId") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (tenantId) {
    where.tenantId = tenantId;
  }

  if (search) {
    where.OR = [
      { query: { contains: search, mode: "insensitive" } },
      { answer: { contains: search, mode: "insensitive" } },
    ];
  }

  if (from || to) {
    where.timestamp = {};
    if (from) {
      (where.timestamp as Record<string, unknown>).gte = new Date(from);
    }
    if (to) {
      (where.timestamp as Record<string, unknown>).lte = new Date(`${to}T23:59:59.999Z`);
    }
  }

  // Query logs with tenant info
  const [logs, total] = await Promise.all([
    prisma.queryLog.findMany({
      where,
      include: {
        tenant: { select: { name: true, slug: true } },
        user: { select: { email: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.queryLog.count({ where }),
  ]);

  // Get tenant list for filter dropdown
  const tenantFilter = await prisma.tenant.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return Response.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      tenants: tenantFilter,
    },
  });
});
