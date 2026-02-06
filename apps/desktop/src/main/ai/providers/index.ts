import ollamaProvider from "~/main/ai/providers/ollama";
import openaiCompatibleProvider from "~/main/ai/providers/openai-compatible";
import storage from "~/main/utils/storage";

const providers = {
  ollama: ollamaProvider,
  openaiCompatible: openaiCompatibleProvider,
};

export const getModel = () => {
  const selectedProvider = storage.store.get("selectedProvider", "ollama") as string;
  const provider = providers[selectedProvider as keyof typeof providers];

  if (!provider) {
    throw new Error(`Provider '${selectedProvider}' is not supported`);
  }

  const providerConfigString = storage.secureStore.get(`provider::${selectedProvider}`);

  if (!providerConfigString) {
    throw new Error(`Provider config for '${selectedProvider}' is not configured`);
  }

  const providerConfig = JSON.parse(providerConfigString) as {
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };

  return provider(providerConfig.model);
};
