// KOMPASSI - PDF Text Extraction
// Extracts raw text from PDF files for chunking and embedding.

import pdfParse from "pdf-parse";

/**
 * Extract text content from a PDF file buffer.
 *
 * @param buffer - The PDF file as a Buffer (from FileReader or multer)
 * @returns Extracted text and page count
 * @throws if the file cannot be parsed as a valid PDF
 */
export async function extractPdfText(
  buffer: Buffer
): Promise<{ text: string; pages: number }> {
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pages: data.numpages,
  };
}

/**
 * Quick check: is this buffer likely a PDF?
 */
export function isPdf(buffer: Buffer): boolean {
  // PDF files start with "%PDF"
  const header = buffer.slice(0, 4).toString("utf-8");
  return header === "%PDF";
}
