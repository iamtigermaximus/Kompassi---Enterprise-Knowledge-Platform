// KOMPASSI - GET /api/tenants/me
// Returns the current tenant's information based on x-api-key.
// Verifies that authentication and RLS tenant context are working.

import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_request, tenant) => {
  // Fetch users in this tenant to verify RLS is working
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return Response.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      queriesPerDay: tenant.queriesPerDay,
      createdAt: tenant.createdAt,
    },
    users,
  });
});
