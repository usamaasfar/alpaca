import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import storage from "~/main/utils/storage";

export default function anthropicProvider(model: string) {
  const providerConfigString = storage.get("provider::anthropic");

  if (!providerConfigString) {
    throw new Error("Provider config for 'anthropic' is not configured");
  }

  const config = JSON.parse(providerConfigString as string) as {
    apiKey: string;
  };

  const provider = createOpenAICompatible({
    name: "anthropic",
    apiKey: config.apiKey,
    baseURL: "https://api.anthropic.com/v1",
    includeUsage: true,
  });

  return provider(model);
}
