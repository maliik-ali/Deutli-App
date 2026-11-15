import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * One place that talks to an AI model, so the model can be swapped without touching features.
 *
 * Pick it with environment variables (server only, set on Vercel):
 *   AI_PROVIDER = "anthropic" (default) | "openai"   ("openai" = any OpenAI-compatible service:
 *                 Gemini, Groq, OpenRouter, DeepSeek, Kimi …)
 *   AI_MODEL    = model name. Default for anthropic: claude-haiku-5-5
 *   AI_BASE_URL = for "openai", e.g. https://api.groq.com/openai/v1
 *   AI_API_KEY  = for "openai". ("anthropic" uses ANTHROPIC_API_KEY)
 */

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";

export type AiJsonResult<T> = { data: T; provider: string; model: string };
type Request<T> = { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number };

function settings() {
  const provider = process.env.AI_PROVIDER === "openai" ? ("openai" as const) : ("anthropic" as const);
  if (provider === "anthropic") {
    return { provider, model: process.env.AI_MODEL || DEFAULT_ANTHROPIC_MODEL, ready: !!process.env.ANTHROPIC_API_KEY };
  }
  const model = process.env.AI_MODEL ?? "";
  const baseUrl = (process.env.AI_BASE_URL ?? "").replace(/\/+$/, "");
  const apiKey = process.env.AI_API_KEY ?? "";
  return { provider, model, baseUrl, apiKey, ready: !!(model && baseUrl && apiKey) };
}

/** True when an AI model is configured. */
export function aiReady() {
  return settings().ready;
}

let anthropicClient: Anthropic | null = null;

async function viaAnthropic<T>(req: Request<T>, model: string): Promise<T | null> {
  anthropicClient ??= new Anthropic({ timeout: 40_000, maxRetries: 1 });
  const response = await anthropicClient.messages.parse({
    model,
    max_tokens: req.maxTokens ?? 3000,
    output_config: { format: zodOutputFormat(req.schema) },
    system: req.system,
    messages: [{ role: "user", content: req.user }],
  });
  if (response.stop_reason === "refusal" || response.parsed_output == null) return null;
  return response.parsed_output as T;
}

async function viaOpenAiCompatible<T>(req: Request<T>, s: { model: string; baseUrl: string; apiKey: string }): Promise<T | null> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(req.schema));
  const res = await fetch(`${s.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({
      model: s.model,
      temperature: 0.2,
      max_tokens: req.maxTokens ?? 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${req.system}\n\nReply with ONLY a JSON object that matches this JSON Schema:\n${jsonSchema}` },
        { role: "user", content: req.user },
      ],
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw new Error(`AI service answered ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = body.choices?.[0]?.message?.content ?? "";
  const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const parsed = req.schema.safeParse(JSON.parse(text));
  return parsed.success ? parsed.data : null;
}

/**
 * Asks the model for JSON that matches `schema`. Retries once if the answer is unusable.
 * Returns null if no model is configured or both tries fail (the caller shows a friendly message).
 */
export async function generateJson<T>(req: Request<T>): Promise<AiJsonResult<T> | null> {
  const s = settings();
  if (!s.ready) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data =
        s.provider === "anthropic"
          ? await viaAnthropic(req, s.model)
          : await viaOpenAiCompatible(req, s as { model: string; baseUrl: string; apiKey: string });
      if (data != null) return { data, provider: s.provider, model: s.model };
    } catch (error) {
      console.error("AI call failed", s.provider, s.model, error instanceof Error ? error.message : error);
    }
  }
  return null;
}
