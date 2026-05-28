// Phase 2.2 — DigitalOcean Agent client (OpenAI-compatible API).
// Used for short-form article summarization (DeepSeek V3.2). Translation goes
// through OpenAI's direct API (openai-client.ts) for better Nepali fidelity.
//
// Configure on the server with:
//   DO_AGENT_URL=https://<agent-host>.agents.do-ai.run
//   DO_AGENT_KEY=<endpoint access key>
//   DO_AGENT_MODEL=<optional; defaults to "n/a" since DO agents pick the model themselves>

const TIMEOUT_MS = 60_000;

export function isDoAgentConfigured(): boolean {
  return !!process.env.DO_AGENT_URL && !!process.env.DO_AGENT_KEY;
}

export interface ChatResult {
  content: string;
}

export async function chat(
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<ChatResult | null> {
  const baseUrl = process.env.DO_AGENT_URL;
  const apiKey = process.env.DO_AGENT_KEY;
  if (!baseUrl || !apiKey) return null;

  // DO Agent uses an OpenAI-compatible endpoint at /api/v1/chat/completions.
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/chat/completions`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // DO agents pick the model attached to them; the field is required but ignored.
        model: process.env.DO_AGENT_MODEL ?? "n/a",
        // DO GenAI agents REJECT system/developer-role messages with HTTP 400
        // ("agent instructions are set via agent configuration"). The agent's
        // persona lives in its dashboard config, not the request. So we fold our
        // task instructions into the single user turn — DeepSeek follows them
        // exactly the same, and the call no longer 400s.
        messages: [
          { role: "user", content: `${systemPrompt}\n\n========\n\n${userPrompt}` },
        ],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 400,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[do-agent] HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return { content };
  } catch (err) {
    console.error("[do-agent] request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
