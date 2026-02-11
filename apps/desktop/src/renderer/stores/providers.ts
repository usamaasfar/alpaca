import { create } from "zustand";
import { PROVIDERS, type ProviderType } from "~/common/providers";

// Storage types (what we save to disk - no discriminator field)
interface OllamaStorage {
  model: string;
}

interface OpenAICompatibleStorage {
  model: string;
  apiKey: string;
  baseUrl: string;
}

interface ApiKeyProviderStorage {
  model: string;
  apiKey: string;
}

// Runtime types (what we use in the app - with discriminator for type safety)
export interface OllamaProvider {
  provider: "ollama";
  model: string;
}

export interface OpenAICompatibleProvider {
  provider: "openaiCompatible";
  model: string;
  apiKey: string;
  baseUrl: string;
}

export interface OpenAIProvider {
  provider: "openai";
  model: string;
  apiKey: string;
}

export interface AnthropicProvider {
  provider: "anthropic";
  model: string;
  apiKey: string;
}

export interface GoogleProvider {
  provider: "google";
  model: string;
  apiKey: string;
}

type ProviderConfig = OllamaProvider | OpenAICompatibleProvider | OpenAIProvider | AnthropicProvider | GoogleProvider;

interface ProvidersSettingsStore {
  // State
  isLoading: boolean;
  selectedProvider: ProviderType;
  providers: Partial<Record<ProviderType, ProviderConfig>>;
  // Ollama state
  isOllamaConnected: boolean;
  ollamaModels: string[];

  // Methods
  getProviders: () => Promise<void>;
  setProvider: (config: ProviderConfig) => Promise<void>;
  setSelectedProvider: (provider: ProviderType) => Promise<void>;
  // Ollama methods
  getOllamaHealth: () => Promise<void>;
  getOllamaModels: () => Promise<void>;
}

export const useProvidersSettingsStore = create<ProvidersSettingsStore>((set) => ({
  // Initial state
  isLoading: false,
  selectedProvider: "ollama",
  providers: {},
  isOllamaConnected: false,
  ollamaModels: [],

  getProviders: async () => {
    set({ isLoading: true });
    try {
      const loadedProviders: Partial<Record<ProviderType, ProviderConfig>> = {};

      for (const providerInfo of PROVIDERS) {
        const configJson = await window.electronAPI.getStorage(`provider::${providerInfo.type}`);
        if (configJson) loadedProviders[providerInfo.type] = deserializeProvider(providerInfo.type, configJson);
      }

      const selectedProvider = (await window.electronAPI.getStorage("selectedProvider")) as string | undefined;
      const validProvider = PROVIDERS.find((provider) => provider.type === selectedProvider)?.type;

      set({ providers: loadedProviders, selectedProvider: validProvider || "ollama", isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  setProvider: async (config) => {
    try {
      const serialized = serializeProvider(config);
      await window.electronAPI.setStorage(`provider::${config.provider}`, serialized);
      set((state) => ({ providers: { ...state.providers, [config.provider]: config } }));
    } catch (error) {
      console.error(error);
    }
  },

  setSelectedProvider: async (provider) => {
    try {
      await window.electronAPI.setStorage("selectedProvider", provider);
      set({ selectedProvider: provider });
    } catch (error) {
      console.error(error);
    }
  },

  getOllamaHealth: async () => {
    set({ isLoading: true });
    try {
      const health = await window.electronAPI.getOllamaHealth();
      set({ isOllamaConnected: health, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isOllamaConnected: false, isLoading: false });
    }
  },

  getOllamaModels: async () => {
    set({ isLoading: true });
    try {
      const models = await window.electronAPI.getOllamaModels();
      set({ ollamaModels: models, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ ollamaModels: [], isLoading: false });
    }
  },
}));

// Serialization: Convert runtime config to storage format
function serializeProvider(config: ProviderConfig): string {
  switch (config.provider) {
    case "ollama": {
      const storage: OllamaStorage = { model: config.model };
      return JSON.stringify(storage);
    }
    case "openaiCompatible": {
      const storage: OpenAICompatibleStorage = {
        model: config.model,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
      };
      return JSON.stringify(storage);
    }
    case "openai":
    case "anthropic":
    case "google": {
      const storage: ApiKeyProviderStorage = {
        model: config.model,
        apiKey: config.apiKey,
      };
      return JSON.stringify(storage);
    }
  }
}

// Deserialization: Convert storage format to runtime config
function deserializeProvider(type: ProviderType, json: string): ProviderConfig {
  const parsed = JSON.parse(json);

  switch (type) {
    case "ollama": {
      const provider: OllamaProvider = { provider: "ollama", model: parsed.model };
      return provider;
    }
    case "openaiCompatible": {
      const provider: OpenAICompatibleProvider = {
        provider: "openaiCompatible",
        model: parsed.model,
        apiKey: parsed.apiKey,
        baseUrl: parsed.baseUrl,
      };
      return provider;
    }
    case "openai": {
      const provider: OpenAIProvider = {
        provider: "openai",
        model: parsed.model,
        apiKey: parsed.apiKey,
      };
      return provider;
    }
    case "anthropic": {
      const provider: AnthropicProvider = {
        provider: "anthropic",
        model: parsed.model,
        apiKey: parsed.apiKey,
      };
      return provider;
    }
    case "google": {
      const provider: GoogleProvider = {
        provider: "google",
        model: parsed.model,
        apiKey: parsed.apiKey,
      };
      return provider;
    }
  }
}
