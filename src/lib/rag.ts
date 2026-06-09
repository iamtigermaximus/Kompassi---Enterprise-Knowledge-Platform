// KOMPASSI - RAG Pipeline
// Full retrieval-augmented generation pipeline:
//   1. Embed query → 2. Vector search → 3. Format context → 4. LLM answer → 5. Log

import { prisma } from "@/lib/prisma";
import { generateEmbeddings } from "@/lib/embeddings";
import { chat } from "@/lib/deepseek";
import type { Chunk } from "@prisma/client";

const TOP_K = 5; // Number of chunks to retrieve
const SIMILARITY_THRESHOLD = 0.15; // Minimum cosine similarity (0-1, lower = more results)

interface RetrievedChunk {
  chunk: Chunk;
  documentTitle: string;
  similarity: number;
}

export interface RagResult {
  answer: string;
  sources: string[];
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latency: number; // milliseconds
}

/**
 * Run the full RAG pipeline for a tenant-scoped query.
 */
export async function ragQuery(
  query: string,
  tenantId: string,
  userId?: string,
  documentIds?: string[]
): Promise<RagResult> {
  const startedAt = Date.now();

  // Step 1: Embed the query
  const [queryEmbedding] = await generateEmbeddings([query]);
  const embeddingLiteral = formatVectorLiteral(queryEmbedding);

  console.log(`[rag] Query: "${query.slice(0, 80)}..." | Tenant: ${tenantId} | Embedding dims: ${queryEmbedding.length}`);

  // Step 2: Check if there are any chunks for this tenant at all
  const chunkWhere: Record<string, unknown> = { tenantId };
  if (documentIds && documentIds.length > 0) {
    chunkWhere.documentId = { in: documentIds };
  }
  const chunkCount = await prisma.chunk.count({ where: chunkWhere });
  console.log(`[rag] Chunks in tenant (filtered): ${chunkCount}`);

  if (chunkCount === 0) {
    const latency = Date.now() - startedAt;
    return {
      answer:
        "No documents have been uploaded to your workspace yet. Upload a PDF first, then ask questions about its content.",
      sources: [],
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      latency,
    };
  }

  // Step 3: Vector similarity search (cosine distance), tenant-scoped
  const hasDocFilter = documentIds && documentIds.length > 0;
  const docIdPlaceholders = hasDocFilter
    ? documentIds.map((_, i) => `$${i + 3}`).join(",")
    : "";
  const limitParam = hasDocFilter ? `$${3 + documentIds.length}` : "$3";

  const params: unknown[] = [embeddingLiteral, tenantId];
  if (hasDocFilter) {
    params.push(...documentIds);
  }
  params.push(TOP_K);

  const chunks = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      documentId: string;
      tenantId: string;
      content: string;
      chunkIndex: number;
      title: string;
      similarity: number;
    }>
  >(
    `SELECT
       c.id,
       c."documentId",
       c."tenantId",
       c.content,
       c."chunkIndex",
       d.title,
       1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     JOIN documents d ON d.id = c."documentId"
     WHERE c."tenantId" = $2
       ${hasDocFilter ? `AND c."documentId" IN (${docIdPlaceholders})` : ""}
     ORDER BY c.embedding <=> $1::vector
     LIMIT ${limitParam}`,
    ...params
  );

  console.log(`[rag] Vector search returned ${chunks.length} chunks (top similarities: ${chunks.slice(0, 3).map(c => c.similarity?.toFixed(4)).join(", ")})`);

  // Step 4: Format context for the LLM
  const retrievedChunks: RetrievedChunk[] = chunks
    .filter((row) => row.similarity > SIMILARITY_THRESHOLD)
    .map((row) => ({
      chunk: {
        id: row.id,
        documentId: row.documentId,
        tenantId: row.tenantId,
        content: row.content,
        chunkIndex: row.chunkIndex,
        embedding: queryEmbedding,
        createdAt: new Date(),
      },
      documentTitle: row.title,
      similarity: row.similarity,
    }));

  console.log(`[rag] After threshold (${SIMILARITY_THRESHOLD}): ${retrievedChunks.length} chunks`);

  if (retrievedChunks.length === 0) {
    const latency = Date.now() - startedAt;
    return {
      answer:
        "I could not find any relevant information in your knowledge base to answer this question.",
      sources: [],
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      latency,
    };
  }

  // Build context string with document citations
  const context = retrievedChunks
    .map(
      (rc) =>
        `[Source: ${rc.documentTitle}]\n${rc.chunk.content}`
    )
    .join("\n\n");

  // Step 5: Call DeepSeek with context
  const chatResult = await chat(query, context);

  // Deduplicate source titles while preserving order
  const sources = [
    ...new Set(retrievedChunks.map((rc) => rc.documentTitle)),
  ];

  const latency = Date.now() - startedAt;

  // Step 6: Log query
  try {
    await prisma.queryLog.create({
      data: {
        tenantId,
        userId: userId || null,
        query,
        answer: chatResult.answer,
        sources: JSON.stringify(sources),
        tokensIn: chatResult.tokensIn,
        tokensOut: chatResult.tokensOut,
        cost: chatResult.cost,
        latency,
        model: chatResult.model,
      },
    });
  } catch (logError) {
    console.error("Failed to log query:", logError);
  }

  return {
    answer: chatResult.answer,
    sources,
    tokensIn: chatResult.tokensIn,
    tokensOut: chatResult.tokensOut,
    cost: chatResult.cost,
    latency,
  };
}

function formatVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
