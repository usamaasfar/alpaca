import { createCerebras } from "@ai-sdk/cerebras";

import storage from "~/main/utils/storage";

export default function cerebrasProvider(model: string) {
  const cerebras = createCerebras({
    apiKey: storage.secureStore.get("cerebras-provider-api-key"),
  });

  return cerebras(model);
}
