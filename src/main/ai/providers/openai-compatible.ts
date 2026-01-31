import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import storage from "~/main/utils/storage";

export default function openaiCompatibleProvider(model: string) {
  const config = storage.store.get("openaiCompatible-provider-config") as {
    name: string;
    baseURL: string;
  };

  const provider = createOpenAICompatible({
    name: config.name,
    apiKey: storage.secureStore.get("openaiCompatible-provider-api-key"),
    baseURL: config.baseURL,
    includeUsage: true,
  });

  return provider(model);
}
