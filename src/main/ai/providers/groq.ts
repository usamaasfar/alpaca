import { createGroq } from "@ai-sdk/groq";

import storage from "~/main/utils/storage";

export default function groqProvider(model: string) {
  const groq = createGroq({
    apiKey: storage.secureStore.get("groq-provider-api-key"),
  });

  return groq(model);
}
