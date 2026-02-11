import { createGoogleGenerativeAI } from "@ai-sdk/google";

import storage from "~/main/utils/storage";

export default function googleProvider(model: string) {
  const providerConfigString = storage.get("provider::google");

  if (!providerConfigString) {
    throw new Error("Provider config for 'google' is not configured");
  }

  const config = JSON.parse(providerConfigString as string) as {
    apiKey: string;
  };

  const provider = createGoogleGenerativeAI({
    apiKey: config.apiKey,
  });

  return provider(model);
}
