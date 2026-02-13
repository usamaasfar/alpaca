import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { type LanguageModel } from "ai";
import { ollama } from "ollama-ai-provider";

import storage from "~/main/utils/storage";

type ProviderType = "openai" | "anthropic" | "ollama" | "google" | "openai-compatible";

interface OpenAIConfig {
  model: string;
  apiKey: string;
}

interface AnthropicConfig {
  model: string;
  apiKey: string;
}

interface OllamaConfig {
  model: string;
}

interface GoogleConfig {
  model: string;
  apiKey: string;
}

interface OpenAICompatibleConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
}

type ProviderConfig = OpenAIConfig | AnthropicConfig | OllamaConfig | GoogleConfig | OpenAICompatibleConfig;

let cachedModel: LanguageModel | null = null;

export const model = {
  load: () => {
    if (cachedModel) return cachedModel;

    const selectedProvider = storage.get("provider::selected") as ProviderType | undefined;
    if (!selectedProvider) throw new Error("No provider selected");

    const configKey = `provider::${selectedProvider}::config`;
    const configString = storage.get(configKey);
    if (!configString) throw new Error(`Provider config for ${selectedProvider} is not configured`);

    const config = JSON.parse(configString as string) as ProviderConfig;

    switch (selectedProvider) {
      case "openai": {
        const openaiConfig = config as OpenAIConfig;
        const openai = createOpenAI({ apiKey: openaiConfig.apiKey });
        cachedModel = openai(openaiConfig.model);
        break;
      }
      case "anthropic": {
        const anthropicConfig = config as AnthropicConfig;
        const anthropic = createAnthropic({ apiKey: anthropicConfig.apiKey });
        cachedModel = anthropic(anthropicConfig.model);
        break;
      }
      case "ollama": {
        const ollamaConfig = config as OllamaConfig;
        // @ts-ignore
        cachedModel = ollama(ollamaConfig.model);
        break;
      }
      case "google": {
        const googleConfig = config as GoogleConfig;
        const google = createGoogleGenerativeAI({ apiKey: googleConfig.apiKey });
        cachedModel = google(googleConfig.model);
        break;
      }
      case "openai-compatible": {
        const compatibleConfig = config as OpenAICompatibleConfig;
        cachedModel = createOpenAICompatible({
          name: "openai-compatible",
          apiKey: compatibleConfig.apiKey,
          baseURL: compatibleConfig.baseUrl,
          includeUsage: true,
        })(compatibleConfig.model);
        break;
      }
      default:
        throw new Error(`Unknown provider: ${selectedProvider}`);
    }

    return cachedModel;
  },

  reload: () => {
    return (cachedModel = model.load());
  },
};
