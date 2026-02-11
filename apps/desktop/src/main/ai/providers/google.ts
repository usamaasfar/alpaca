import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import storage from "~/main/utils/storage";

export default function googleProvider(model: string) {
  const providerConfigString = storage.get("provider::google");

  if (!providerConfigString) {
    throw new Error("Provider config for 'google' is not configured");
  }

  const config = JSON.parse(providerConfigString as string) as {
    apiKey: string;
  };

  const provider = createOpenAICompatible({
    name: "google",
    apiKey: config.apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    includeUsage: true,
  });

  return provider(model);
}
