// Provider calls over plain fetch, so the same code runs in Convex actions.
// Only the server calls these: user keys are decrypted there and never sent to
// the browser.

export type Provider = "gemini" | "openai";

export interface AiConfig {
  provider: Provider;
  apiKey: string;
  model: string;
}

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
}

/** Asks the configured model for a JSON object. */
export type AskJson = (system: string, user: string) => Promise<Record<string, unknown>>;

export const providerInfo: Record<
  Provider,
  { label: string; host: string; defaultModel: string; keyPlaceholder: string; keyUrl: string }
> = {
  gemini: {
    label: "Google Gemini",
    host: "generativelanguage.googleapis.com",
    // Google's alias for its current Flash-Lite model, so the default keeps
    // working as model versions change.
    defaultModel: "gemini-flash-lite-latest",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/api-keys",
  },
  openai: {
    label: "OpenAI",
    host: "api.openai.com",
    defaultModel: "gpt-5-nano",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
  },
};

export const DEFAULT_PROVIDER: Provider = "gemini";

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) throw new Error(`${res.status} ${json.error?.message ?? res.statusText}`);
  return json;
}

/* ---------- Gemini ---------- */

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

function gemini<T>(apiKey: string, path: string, body?: unknown) {
  return request<T>(`${GEMINI}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

/** Gemini models this key can call for text generation. */
export async function listGeminiModels(apiKey: string): Promise<string[]> {
  const out = await gemini<{ models?: { name: string; supportedGenerationMethods?: string[] }[] }>(
    apiKey,
    "models?pageSize=200",
  );
  return (out.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /gemini/.test(m.name))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => !/(image|tts|audio|live|embedding|vision)/.test(name))
    .sort()
    .reverse();
}

/* ---------- OpenAI ---------- */

type OpenAIResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function openai<T>(apiKey: string, body: unknown) {
  return request<T>("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
}

const openaiReasoning = (model: string) => (model.startsWith("gpt-5") ? { reasoning_effort: "low" } : {});

/* ---------- shared ---------- */

/** One JSON completion, with token usage for the logs. */
export async function completeJson(
  ai: AiConfig,
  system: string,
  user: string,
): Promise<{ data: Record<string, unknown>; usage: AiUsage }> {
  let text: string;
  let usage: AiUsage;
  if (ai.provider === "gemini") {
    const out = await gemini<GeminiResponse>(ai.apiKey, `models/${encodeURIComponent(ai.model)}:generateContent`, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    text = out.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
    usage = { inputTokens: out.usageMetadata?.promptTokenCount, outputTokens: out.usageMetadata?.candidatesTokenCount };
  } else {
    const out = await openai<OpenAIResponse>(ai.apiKey, {
      model: ai.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      ...openaiReasoning(ai.model),
    });
    text = out.choices?.[0]?.message?.content ?? "{}";
    usage = { inputTokens: out.usage?.prompt_tokens, outputTokens: out.usage?.completion_tokens };
  }
  // Some models wrap JSON in a code fence even when asked not to.
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return { data: JSON.parse(cleaned) as Record<string, unknown>, usage };
}

/** Cheapest possible call that proves the key and model work. */
export async function testKey(ai: AiConfig): Promise<void> {
  if (ai.provider === "gemini") {
    await gemini(ai.apiKey, `models/${encodeURIComponent(ai.model)}:generateContent`, {
      contents: [{ role: "user", parts: [{ text: "Reply with OK." }] }],
      generationConfig: { maxOutputTokens: 8 },
    });
    return;
  }
  await openai(ai.apiKey, {
    model: ai.model,
    messages: [{ role: "user", content: "Reply with OK." }],
    max_completion_tokens: 16,
    ...openaiReasoning(ai.model),
  });
}

/** Turns provider errors into one plain sentence with the fix. */
export function friendlyAiError(err: unknown, provider: Provider): string {
  const name = providerInfo[provider].label;
  const message = err instanceof Error ? err.message : String(err);
  if (/401|403|api key not valid|incorrect api key|invalid api key|permission/i.test(message))
    return `${name} rejected the key. Check it in Settings.`;
  if (/429|quota|rate limit|resource.?exhausted/i.test(message))
    return `${name} rate limit or free quota reached. Wait a minute and try again.`;
  if (/404|not found|does not exist|not supported/i.test(message) && /model/i.test(message))
    return "Your key cannot use this model. Choose another model in Settings.";
  if (/JSON/i.test(message)) return "The AI returned an unreadable answer. Try again.";
  if (/fetch|network/i.test(message)) return `Could not reach ${name}. Try again.`;
  return message.split("\n")[0].slice(0, 200);
}
