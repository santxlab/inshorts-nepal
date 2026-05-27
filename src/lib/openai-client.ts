// Phase 2.2 — Direct OpenAI chat-completions wrapper.
// We talk to OpenAI's REST API directly (no SDK) to keep the dependency
// surface small. Returns null on any failure so callers can gracefully skip
// translation for that article.

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = 60_000;

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface ChatResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

export async function chat(
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<ChatResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 600,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[openai] HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    return {
      content,
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
    };
  } catch (err) {
    console.error("[openai] request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
