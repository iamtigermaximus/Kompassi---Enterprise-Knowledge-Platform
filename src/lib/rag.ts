// KOMPASSI - RAG Pipeline
// Full retrieval-augmented generation pipeline:
//   1. Embed query → 2. Vector search → 3. Format context → 4. LLM answer → 5. Log

import { prisma } from "@/lib/prisma";
import { generateEmbeddings } from "@/lib/embeddings";
import { chat } from "@/lib/deepseek";
import type { Chunk } from "@prisma/client";

const TOP_K = 5; // Number of chunks to retrieve
const SIMILARITY_THRESHOLD = 0.3; // Minimum cosine similarity to include a chunk

interface RetrievedChunk {
  chunk: Chunk;
  documentTitle: string;
  similarity: number;
}

export interface RagResult {
  answer: string;
  sources: string[]; // Document titles used as sources
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latency: number; // milliseconds
}

/**
 * Run the full RAG pipeline for a tenant-scoped query.
 *
 * @param query - User's natural language question
 * @param tenantId - Tenant ID for tenant isolation
 * @param userId - Optional user ID for audit logging
 * @returns Answer with sources, tokens, cost, and latency
 */
export async function ragQuery(
  query: string,
  tenantId: string,
  userId?: string
): Promise<RagResult> {
  const startedAt = Date.now();

  // Step 1: Embed the query
  const [queryEmbedding] = await generateEmbeddings([query]);
  const embeddingLiteral = formatVectorLiteral(queryEmbedding);

  // Step 2: Vector similarity search (cosine distance), tenant-scoped
  // Uses pgvector's <=> operator for cosine distance.
  // lower distance = more similar.
  const chunks = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      documentId: string;
      tenantId: string;
      content: string;
      chunkIndex: number;
      "d.title": string;
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
       AND 1 - (c.embedding <=> $1::vector) > $3
     ORDER BY c.embedding <=> $1::vector
     LIMIT $4`,
    embeddingLiteral,
    tenantId,
    SIMILARITY_THRESHOLD,
    TOP_K
  );

  // Step 3: Format context for the LLM
  const retrievedChunks: RetrievedChunk[] = chunks.map((row) => ({
    chunk: {
      id: row.id,
      documentId: row.documentId,
      tenantId: row.tenantId,
      content: row.content,
      chunkIndex: row.chunkIndex,
      embedding: queryEmbedding, // not used downstream
      createdAt: new Date(),
    },
    documentTitle: row["d.title"],
    similarity: row.similarity,
  }));

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

  // Step 4: Call DeepSeek with context
  const chatResult = await chat(query, context);

  // Deduplicate source titles while preserving order
  const sources = [
    ...new Set(retrievedChunks.map((rc) => rc.documentTitle)),
  ];

  const latency = Date.now() - startedAt;

  // Step 5: Log query to QueryLog for cost tracking and audit
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
    // Don't fail the request if logging fails
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

/**
 * Format a number array as a pgvector literal string.
 * Example: [0.1, 0.2, 0.3] → '[0.1,0.2,0.3]'
 */
function formatVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
