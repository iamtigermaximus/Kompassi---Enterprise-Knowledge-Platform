// KOMPASSI - GET /api/documents
// List all documents for the authenticated tenant.

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_request, tenant) => {
  const documents = await prisma.document.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      title: true,
      filename: true,
      fileSize: true,
      status: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      filename: d.filename,
      fileSize: d.fileSize,
      status: d.status,
      createdAt: d.createdAt,
      chunksCreated: d._count.chunks,
    })),
  });
});
