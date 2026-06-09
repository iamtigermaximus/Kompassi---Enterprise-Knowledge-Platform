// KOMPASSI - DELETE /api/documents/[id]
// Delete a document and its chunks. Tenant-scoped via RLS.

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const DELETE = withAuth(async (request, tenant) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const documentId = segments[segments.length - 1];

  if (!documentId) {
    return NextResponse.json({ error: "Missing document ID." }, { status: 400 });
  }

  // Verify the document belongs to this tenant
  const doc = await prisma.document.findFirst({
    where: { id: documentId, tenantId: tenant.id },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // Delete chunks first, then the document
  await prisma.chunk.deleteMany({ where: { documentId } });
  await prisma.document.delete({ where: { id: documentId } });

  return NextResponse.json({ deleted: true, id: documentId, title: doc.title });
});
