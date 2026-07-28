// Groq client — OpenAI-compatible chat completions.
//
// Primary provider for short-form summaries and weekly insights. Chosen over
// the DigitalOcean agent (DeepSeek V3.2) after measuring Nepali output quality
// against the same devanagariRatio guard summary-service.ts enforces:
//
//   llama-3.3-70b-versatile : 4/4 passed, 100% Devanagari, ~540ms avg
//   openai/gpt-oss-120b     : 0/4 — returns empty (reasoning eats the budget)
//   qwen/qwen3.6-27b        : 0/4 — leaks <think> reasoning blocks into output
//
// So the model choice here is deliberate, not arbitrary. Llama 3.3 70B also
// preserves Nepali proper nouns, Devanagari numerals and the sentence-final "।"
// correctly, which is exactly where the previous provider kept failing.
//
// Configure with:
//   GROQ_API_KEY=gsk_...
//   GROQ_MODEL=<optional; defaults to llama-3.3-70b-versatile>

const TIMEOUT_MS = 45_000;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export interface ChatResult {
  content: string;
}

/**
 * Strip reasoning blocks some models emit before the answer. Llama 3.3 does not
 * do this, but keeping the guard means swapping GROQ_MODEL to a reasoning model
 * later cannot silently poison every cached summary.
 */
function stripReasoning(s: string): string {
  return s
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^<think>[\s\S]*$/i, "")
    .trim();
}

export async function chat(
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<ChatResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model ?? process.env.GROQ_MODEL ?? DEFAULT_MODEL,
        // Groq accepts a proper system role (unlike the DO agent, which 400s on
        // it), so the instruction stays where it belongs.
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 400,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[groq] HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    const content = stripReasoning(raw);
    if (!content) return null;
    return { content };
  } catch (err) {
    console.error("[groq] request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
