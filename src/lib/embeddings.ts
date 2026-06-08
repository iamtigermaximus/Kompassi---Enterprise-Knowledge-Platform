// KOMPASSI - Embeddings Client
// Calls the local Python sentence-transformers embedding server.
// Server: python scripts/embed_server.py (listens on port 5001)

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || "http://127.0.0.1:5001";

interface EmbedResponse {
  embeddings: number[][];
  dimensions: number;
  count: number;
}

/**
 * Generate embeddings for one or more texts using the local embedding server.
 *
 * @param texts - Array of text strings to embed
 * @returns Array of 384-dimension embeddings (shape: [texts.length, 384])
 * @throws if the embedding server is unreachable
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch(`${EMBED_SERVER_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Embedding server returned ${response.status}: ${errorBody}`
    );
  }

  const data: EmbedResponse = await response.json();
  return data.embeddings;
}

/**
 * Check if the embedding server is running.
 */
export async function isEmbedServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${EMBED_SERVER_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
