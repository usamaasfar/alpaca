import { createOpenAI } from "@ai-sdk/openai";

import storage from "~/main/utils/storage";

export default function openaiProvider(model: string) {
  const openai = createOpenAI({
    apiKey: storage.secureStore.get("openai-provider-api-key"),
  });

  return openai(model);
}
