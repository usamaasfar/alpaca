import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { type LanguageModel } from "ai";

import storage from "~/main/utils/storage";

interface ProviderConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
}

let cachedModel: LanguageModel | null = null;

export const model = {
  load: () => {
    if (cachedModel) return cachedModel;

    const providerConfigString = storage.get("provider::config");
    if (!providerConfigString) throw new Error("Provider config is not configured");

    const providerConfig = JSON.parse(providerConfigString as string) as ProviderConfig;

    cachedModel = createOpenAICompatible({
      name: "openai-compatible",
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseUrl,
      includeUsage: true,
    })(providerConfig.model);

    return cachedModel;
  },

  reload: () => {
    cachedModel = null;
    return (cachedModel = model.load());
  },
};
