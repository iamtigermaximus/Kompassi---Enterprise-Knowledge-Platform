// KOMPASSI - DeepSeek API Client
// Uses the OpenAI-compatible API to call DeepSeek V4 Pro.
// Includes cost tracking per query.

import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

// Cost per 1M tokens (USD). Adjust to match your DeepSeek plan.
const COST_PER_1M_INPUT = 0.14;
const COST_PER_1M_OUTPUT = 0.28;

// System prompt for RAG
const RAG_SYSTEM_PROMPT = `You are KOMPASSI, an enterprise knowledge assistant. Answer the user's question using ONLY the provided context below. Follow these rules:

1. Base your answer STRICTLY on the context provided. Do not use outside knowledge.
2. If the context does not contain enough information to answer, say so clearly.
3. Cite the source documents by title in your answer (e.g., [Document Title]).
4. Keep answers concise and professional. Use plain language.
5. Never mention that you were given "context" or "documents" — just answer naturally.

Context:
{context}`;

export interface ChatResult {
  answer: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  model: string;
}

/**
 * Send a RAG query to DeepSeek and return the answer with cost tracking.
 *
 * @param query - The user's question
 * @param context - Retrieved document chunks formatted as context
 * @returns Answer + token/cost breakdown
 */
export async function chat(
  query: string,
  context: string
): Promise<ChatResult> {
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not set. Add it to your .env file."
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });

  const systemMessage = RAG_SYSTEM_PROMPT.replace("{context}", context);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: query },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  const usage = response.usage;
  const tokensIn = usage?.prompt_tokens ?? 0;
  const tokensOut = usage?.completion_tokens ?? 0;
  const cost =
    (tokensIn / 1_000_000) * COST_PER_1M_INPUT +
    (tokensOut / 1_000_000) * COST_PER_1M_OUTPUT;

  const content = response.choices[0]?.message?.content ?? "";

  return {
    answer: content,
    tokensIn,
    tokensOut,
    cost: Math.round(cost * 1_000_000) / 1_000_000, // round to 6 decimal places
    model,
  };
}
