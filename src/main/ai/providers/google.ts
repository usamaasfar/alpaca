import { createGoogleGenerativeAI } from "@ai-sdk/google";

import storage from "~/main/utils/storage";

export default function googleProvider(model: string) {
  const google = createGoogleGenerativeAI({
    apiKey: storage.secureStore.get("google-provider-api-key"),
  });

  return google(model);
}
