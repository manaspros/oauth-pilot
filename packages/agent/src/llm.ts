import { ChatAnthropic } from "@langchain/anthropic";

export const modelName = () => process.env.OAUTH_PILOT_MODEL ?? "claude-sonnet-5-5";

/**
 * ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY are honoured from env alone (D-API-5).
 * Do NOT set `temperature`: claude-sonnet-5-5 rejects non-default values
 * ("temperature is not supported for claude-sonnet-5-5 when set to non-default values").
 */
export function makeLlm(opts: { maxTokens?: number; model?: string } = {}) {
  return new ChatAnthropic({ model: opts.model ?? modelName(), maxTokens: opts.maxTokens ?? 8192 });
}
