import { ChatAnthropic } from "@langchain/anthropic";

export const modelName = () => process.env.OAUTH_PILOT_MODEL ?? "claude-sonnet-5-5";

/** ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY are honoured from env alone (D-API-5). */
export function makeLlm(opts: { maxTokens?: number; temperature?: number } = {}) {
  return new ChatAnthropic({ model: modelName(), maxTokens: opts.maxTokens ?? 8192, temperature: opts.temperature ?? 0 });
}
