// KOMPASSI - POST /api/chat
// RAG chat endpoint: query → embed → vector search → DeepSeek → answer + citations.
// Tenant isolation via RLS. Cost tracked per query. Audit logged.

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { ragQuery } from "@/lib/rag";
import { isEmbedServerRunning } from "@/lib/embeddings";

interface ChatRequest {
  query: string;
}

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

  // Parse request body
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON with a 'query' field." },
      { status: 400 }
    );
  }

  if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'query' field." },
      { status: 400 }
    );
  }

  const query = body.query.trim();

  // Run the RAG pipeline
  try {
    const result = await ragQuery(query, tenant.id);

    return NextResponse.json({
      query,
      answer: result.answer,
      sources: result.sources,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      cost: result.cost,
      latency: result.latency,
    });
  } catch (error) {
    console.error("RAG query failed:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
});
