import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import storage from "~/main/utils/storage";

export default function openaiCompatibleProvider(model: string) {
  const providerConfigString = storage.get("provider::openaiCompatible");

  if (!providerConfigString) {
    throw new Error("Provider config for 'openaiCompatible' is not configured");
  }

  const config = JSON.parse(providerConfigString as string) as {
    baseUrl: string;
    apiKey: string;
  };

  const provider = createOpenAICompatible({
    name: "openai-compatible",
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    includeUsage: true,
  });

  return provider(model);
}
