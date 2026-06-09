// KOMPASSI - POST /api/documents/upload
// Upload a PDF document, extract text, chunk, embed, and store.
// Tenant isolation is enforced by RLS (authenticated via x-api-key).

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractPdfText, isPdf } from "@/lib/pdf";
import { chunkText } from "@/lib/chunk";
import { generateEmbeddings } from "@/lib/embeddings";
import { isEmbedServerRunning } from "@/lib/embeddings";

// Maximum file size: 20 MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const POST = withAuth(async (request, tenant) => {
  // Check that the embedding server is available
  const embedAvailable = await isEmbedServerRunning();
  if (!embedAvailable) {
    return NextResponse.json(
      {
        error:
          "Embedding server is not running. Start it with: python scripts/embed_server.py",
      },
      { status: 503 }
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data with a 'file' field." },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "Missing 'file' field in form data." },
      { status: 400 }
    );
  }

  // Validate file type
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
      { status: 400 }
    );
  }

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!isPdf(buffer)) {
    return NextResponse.json(
      { error: "File does not appear to be a valid PDF." },
      { status: 400 }
    );
  }

  // Extract text from PDF
  let extracted: { text: string; pages: number };
  try {
    extracted = await extractPdfText(buffer);
  } catch {
    return NextResponse.json(
      { error: "Failed to extract text from PDF. The file may be corrupted or unreadable." },
      { status: 422 }
    );
  }

  if (!extracted.text || extracted.text.trim().length === 0) {
    return NextResponse.json(
      { error: "PDF contains no extractable text. Scanned documents are not yet supported." },
      { status: 422 }
    );
  }

  // Store document (RLS ensures tenantId matches current tenant context)
  const document = await prisma.document.create({
    data: {
      tenantId: tenant.id,
      filename: file.name,
      title: file.name.replace(/\.pdf$/i, ""),
      content: extracted.text,
      fileType: "application/pdf",
      fileSize: file.size,
      status: "PROCESSING",
    },
  });

  // Chunk the text
  const chunks = chunkText(extracted.text);

  if (chunks.length === 0) {
    return NextResponse.json(
      {
        document: { id: document.id, title: document.title },
        chunksCreated: 0,
        warning: "No meaningful text chunks could be extracted.",
      },
      { status: 201 }
    );
  }

  // Generate embeddings for all chunks
  let embeddings: number[][];
  try {
    embeddings = await generateEmbeddings(chunks);
  } catch (error) {
    // If embeddings fail, mark document as ERROR
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "ERROR" },
    });
    return NextResponse.json(
      {
        error: `Embedding generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }

  // Store chunks with embeddings (batch insert)
  const chunkRows = chunks.map((content, i) => ({
    documentId: document.id,
    tenantId: tenant.id,
    content,
    embedding: embeddings[i] as unknown as number[],
    chunkIndex: i,
  }));

  // Manual bulk insert via raw SQL to include vector columns
  for (const chunk of chunkRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO chunks ("id", "documentId", "tenantId", content, embedding, "chunkIndex", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, $5, NOW())`,
      chunk.documentId,
      chunk.tenantId,
      chunk.content,
      `[${(chunk.embedding as number[]).join(",")}]`,
      chunk.chunkIndex
    );
  }

  // Mark document as READY
  await prisma.document.update({
    where: { id: document.id },
    data: { status: "READY" },
  });

  return NextResponse.json(
    {
      document: {
        id: document.id,
        title: document.title,
        filename: document.filename,
        fileSize: document.fileSize,
        pages: extracted.pages,
        status: "READY",
      },
      chunksCreated: chunks.length,
    },
    { status: 201 }
  );
});
