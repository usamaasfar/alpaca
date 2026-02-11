import anthropicProvider from "~/main/ai/providers/anthropic";
import googleProvider from "~/main/ai/providers/google";
import ollamaProvider from "~/main/ai/providers/ollama";
import openaiProvider from "~/main/ai/providers/openai";
import openaiCompatibleProvider from "~/main/ai/providers/openai-compatible";
import storage from "~/main/utils/storage";

const providers = {
  ollama: ollamaProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  openaiCompatible: openaiCompatibleProvider,
};

export const getModel = () => {
  const selectedProvider = storage.get("selectedProvider", "ollama") as string;
  const provider = providers[selectedProvider as keyof typeof providers];

  if (!provider) {
    throw new Error(`Provider '${selectedProvider}' is not supported`);
  }

  const providerConfigString = storage.get(`provider::${selectedProvider}`);

  if (!providerConfigString) {
    throw new Error(`Provider config for '${selectedProvider}' is not configured`);
  }

  const providerConfig = JSON.parse(providerConfigString as string) as {
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };

  return provider(providerConfig.model);
};
