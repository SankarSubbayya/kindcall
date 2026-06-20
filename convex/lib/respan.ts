// Thin, dependency-free client for the Respan AI gateway (OpenAI-compatible).
// Routing every LLM call through Respan gives us tracing + evals for free.
// Docs: base URL https://api.respan.ai/api  ->  POST /chat/completions

export const DEFAULT_RESPAN_BASE_URL = "https://api.respan.ai/api";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionParams {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Attached to the Respan trace for filtering/evals in the dashboard. */
  metadata?: Record<string, unknown>;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  raw: unknown;
}

export async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  if (!params.apiKey) throw new Error("RESPAN_API_KEY is required");

  const baseUrl = (params.baseUrl || DEFAULT_RESPAN_BASE_URL).replace(/\/+$/, "");
  const f = params.fetchImpl ?? fetch;

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.2,
  };
  if (params.maxTokens) body.max_tokens = params.maxTokens;
  if (params.metadata) body.metadata = params.metadata;

  const res = await f(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Respan request failed: ${res.status} ${text}`.trim());
  }

  const json = (await res.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json?.choices?.[0]?.message?.content ?? "";
  return { content, model: json?.model ?? params.model, raw: json };
}
