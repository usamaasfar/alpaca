import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import storage from "~/main/utils/storage";

interface ProviderConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
}

export const getModel = () => {
  const providerConfigString = storage.get("provider::config");

  if (!providerConfigString) {
    throw new Error("Provider config is not configured");
  }

  const providerConfig = JSON.parse(providerConfigString as string) as ProviderConfig;

  const provider = createOpenAICompatible({
    name: "openai-compatible",
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseUrl,
    includeUsage: true,
  });

  return provider(providerConfig.model);
};
