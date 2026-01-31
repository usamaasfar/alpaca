import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import storage from "~/main/utils/storage";

export default function openrouterProvider(model: string) {
  const openrouter = createOpenRouter({
    apiKey: storage.secureStore.get("openrouter-provider-api-key"),
  });

  return openrouter(model);
}
