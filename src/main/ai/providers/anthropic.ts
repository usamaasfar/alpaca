import { createAnthropic } from "@ai-sdk/anthropic";

import storage from "~/main/utils/storage";

export default function anthropicProvider(model: string) {
  const anthropic = createAnthropic({
    apiKey: storage.secureStore.get("anthropic-provider-api-key"),
  });

  return anthropic(model);
}
