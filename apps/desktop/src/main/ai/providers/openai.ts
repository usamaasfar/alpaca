import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import storage from "~/main/utils/storage";

export default function openaiProvider(model: string) {
  const providerConfigString = storage.get("provider::openai");

  if (!providerConfigString) {
    throw new Error("Provider config for 'openai' is not configured");
  }

  const config = JSON.parse(providerConfigString as string) as {
    apiKey: string;
  };

  const provider = createOpenAICompatible({
    name: "openai",
    apiKey: config.apiKey,
    baseURL: "https://api.openai.com/v1",
    includeUsage: true,
  });

  return provider(model);
}
