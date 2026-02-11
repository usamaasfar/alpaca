import { createOpenAI } from "@ai-sdk/openai";

import storage from "~/main/utils/storage";

export default function openaiProvider(model: string) {
  const providerConfigString = storage.get("provider::openai");

  if (!providerConfigString) {
    throw new Error("Provider config for 'openai' is not configured");
  }

  const config = JSON.parse(providerConfigString as string) as {
    apiKey: string;
  };

  const provider = createOpenAI({
    apiKey: config.apiKey,
  });

  return provider(model);
}
