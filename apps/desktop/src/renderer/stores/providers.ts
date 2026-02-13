import { create } from "zustand";

export type ProviderType = "openai" | "anthropic" | "ollama" | "google" | "openai-compatible";

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

export type ProviderConfig = OpenAIConfig | AnthropicConfig | OllamaConfig | GoogleConfig | OpenAICompatibleConfig;

interface ProvidersSettingsStore {
  isLoading: boolean;
  selectedProvider?: ProviderType;
  providerConfig?: ProviderConfig;
  initialize: () => Promise<void>;
  getProvider: (provider: ProviderType) => Promise<{ model: string; baseUrl: string; apiKey: string }>;
  setProvider: (provider: ProviderType, config: ProviderConfig) => Promise<void>;
}

export const useProvidersSettingsStore = create<ProvidersSettingsStore>((set) => ({
  isLoading: false,
  selectedProvider: undefined,
  providerConfig: undefined,

  initialize: async () => {
    set({ isLoading: true });

    try {
      const selectedProvider = (await window.electronAPI.getStorage("provider::selected")) as ProviderType | undefined;

      if (!selectedProvider) return set({ selectedProvider: undefined, providerConfig: undefined, isLoading: false });

      const configKey = `provider::${selectedProvider}::config`;
      const configJson = await window.electronAPI.getStorage(configKey);

      if (!configJson) return set({ selectedProvider, providerConfig: undefined, isLoading: false });

      const providerConfig = JSON.parse(configJson as string) as ProviderConfig;
      set({ selectedProvider, providerConfig, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  getProvider: async (provider: ProviderType) => {
    const configKey = `provider::${provider}::config`;
    const configJson = await window.electronAPI.getStorage(configKey);

    let config = { model: "", baseUrl: "", apiKey: "" };
    if (configJson) {
      try {
        const parsed = JSON.parse(configJson as string);
        config = {
          model: parsed.model || "",
          baseUrl: "baseUrl" in parsed ? parsed.baseUrl || "" : "",
          apiKey: "apiKey" in parsed ? parsed.apiKey || "" : "",
        };
      } catch (error) {
        console.error("Failed to parse provider config:", error);
      }
    }

    return config;
  },

  setProvider: async (provider, config) => {
    try {
      const configKey = `provider::${provider}::config`;
      const serialized = JSON.stringify(config);
      await window.electronAPI.setStorage(configKey, serialized);

      await window.electronAPI.setStorage("provider::selected", provider);

      set({ selectedProvider: provider, providerConfig: config });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
}));

// Auto-initialize on store creation
useProvidersSettingsStore.getState().initialize();
