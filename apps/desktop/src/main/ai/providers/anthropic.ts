import { createAnthropic } from "@ai-sdk/anthropic";

import storage from "~/main/utils/storage";

export default function anthropicProvider(model: string) {
  const providerConfigString = storage.get("provider::anthropic");

  if (!providerConfigString) {
    throw new Error("Provider config for 'anthropic' is not configured");
  }

  const config = JSON.parse(providerConfigString as string) as {
    apiKey: string;
  };

  const provider = createAnthropic({
    apiKey: config.apiKey,
  });

  return provider(model);
}
