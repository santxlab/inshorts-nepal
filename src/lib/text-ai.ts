// Single entry point for short-form text generation (summaries, weekly
// insights). Tries providers in order and returns the first success.
//
// Why a chain rather than one client: this app lost BOTH Saransh summaries and
// Weekly Insights simultaneously when a single provider key expired, with no
// fallback and no visible error — the feature just silently returned nothing.
// A chain means one dead credential degrades quality instead of removing the
// feature.
//
// Order is deliberate:
//   1. Groq (llama-3.3-70b-versatile) — measured 4/4 on the app's own Nepali
//      guard at ~540ms, and effectively free. See groq-client.ts for the data.
//   2. DO Agent (DeepSeek V3.2) — the previous primary; kept as a fallback.
//   3. OpenAI — always-works backstop, but the most expensive per call.
import { chat as groqChat, isGroqConfigured } from "./groq-client";
import { chat as doChat, isDoAgentConfigured } from "./do-agent-client";
import { chat as openaiChat, isOpenAIConfigured } from "./openai-client";

export interface ChatResult {
  content: string;
}

export interface TextAIOptions {
  temperature?: number;
  maxTokens?: number;
  /** Skip providers below this one; used by callers that need max quality. */
  preferOpenAI?: boolean;
  /**
   * Caller will JSON.parse the result. Providers that support enforced JSON
   * turn it on — without it, models emit unescaped quotes inside Nepali
   * strings and the payload fails to parse about half the time.
   */
  json?: boolean;
}

export function isTextAIConfigured(): boolean {
  return isGroqConfigured() || isDoAgentConfigured() || isOpenAIConfigured();
}

/** Which providers are usable right now — surfaced in health/doctor endpoints. */
export function textAIProviders(): string[] {
  const out: string[] = [];
  if (isGroqConfigured()) out.push("groq");
  if (isDoAgentConfigured()) out.push("do-agent");
  if (isOpenAIConfigured()) out.push("openai");
  return out;
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  opts: TextAIOptions = {}
): Promise<ChatResult | null> {
  const { preferOpenAI, json, ...rest } = opts;
  // Only Groq is wired for enforced JSON here; the others just get the prompt,
  // which is what they had before.
  const groqOpts = { ...rest, json };

  const chain: { name: string; enabled: boolean; run: () => Promise<ChatResult | null> }[] =
    preferOpenAI
      ? [
          { name: "openai", enabled: isOpenAIConfigured(), run: () => openaiChat(systemPrompt, userPrompt, rest) },
          { name: "groq", enabled: isGroqConfigured(), run: () => groqChat(systemPrompt, userPrompt, groqOpts) },
        ]
      : [
          { name: "groq", enabled: isGroqConfigured(), run: () => groqChat(systemPrompt, userPrompt, groqOpts) },
          { name: "do-agent", enabled: isDoAgentConfigured(), run: () => doChat(systemPrompt, userPrompt, rest) },
          { name: "openai", enabled: isOpenAIConfigured(), run: () => openaiChat(systemPrompt, userPrompt, rest) },
        ];

  for (const provider of chain) {
    if (!provider.enabled) continue;
    const result = await provider.run();
    if (result?.content) return result;
    console.warn(`[text-ai] ${provider.name} returned nothing — trying next provider`);
  }

  console.error("[text-ai] all providers failed or none configured");
  return null;
}
