// KOMPASSI - Text Chunking
// Recursive character text splitter for RAG document processing.
// Splits by paragraph → sentence → word boundaries to preserve semantic coherence.

const CHUNK_SIZE = 500; // target characters per chunk
const CHUNK_OVERLAP = 100; // overlap between adjacent chunks

/**
 * Split text into overlapping chunks for embedding and retrieval.
 *
 * Strategy:
 * 1. Split by double newlines (paragraphs)
 * 2. If a paragraph is too long, split by sentences (period + space)
 * 3. If a sentence is too long, split by word boundaries to fit CHUNK_SIZE
 * 4. Merge small chunks with neighbors while maintaining CHUNK_SIZE
 */
export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
  if (cleaned.length === 0) return [];

  // Step 1: Split into paragraphs
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim().length > 0);
  let chunks: string[] = [];

  // Step 2: Split long paragraphs into sentence-level pieces
  for (const para of paragraphs) {
    const trimmed = para.replace(/\n/g, " ").trim();
    if (trimmed.length <= CHUNK_SIZE) {
      chunks.push(trimmed);
    } else {
      // Split by sentence boundaries (period/exclamation/question mark followed by space)
      const sentences = trimmed
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 0);
      for (const sentence of sentences) {
        if (sentence.length <= CHUNK_SIZE) {
          chunks.push(sentence.trim());
        } else {
          // Force split long sentences by CHUNK_SIZE with overlap
          let start = 0;
          while (start < sentence.length) {
            const end = Math.min(start + CHUNK_SIZE, sentence.length);
            chunks.push(sentence.slice(start, end).trim());
            start += CHUNK_SIZE - CHUNK_OVERLAP;
          }
        }
      }
    }
  }

  // Step 3: Merge small chunks with neighbors
  chunks = mergeSmallChunks(chunks);

  return chunks;
}

/**
 * Merge chunks shorter than half CHUNK_SIZE into adjacent chunks.
 */
function mergeSmallChunks(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;

  const result: string[] = [];
  let buffer = "";

  for (const chunk of chunks) {
    if (buffer.length + chunk.length <= CHUNK_SIZE) {
      buffer = buffer ? `${buffer} ${chunk}` : chunk;
    } else {
      if (buffer) result.push(buffer);
      buffer = chunk;
    }
  }
  if (buffer) result.push(buffer);

  return result;
}
