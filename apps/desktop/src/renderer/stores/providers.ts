import { create } from "zustand";
import { PROVIDERS, type ProviderType } from "~/common/providers";

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

type ProviderConfig = OllamaProvider | OpenAICompatibleProvider;

interface ProvidersSettingsStore {
  // State
  isLoading: boolean;
  selectedProvider: ProviderType;
  providers: Record<ProviderType, ProviderConfig>;
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
  providers: {} as Record<ProviderType, ProviderConfig>,
  isOllamaConnected: false,
  ollamaModels: [],

  getProviders: async () => {
    set({ isLoading: true });
    try {
      for (const providerInfo of PROVIDERS) {
        const config = await window.electronAPI.getSecureStorage(`provider::${providerInfo.type}`);
        if (config) set((state) => ({ providers: { ...state.providers, [providerInfo.type]: JSON.parse(config) } }));
      }

      const selectedProvider = (await window.electronAPI.getStorage("selectedProvider")) as string | undefined;
      const validProvider = PROVIDERS.find((provider) => provider.type === selectedProvider)?.type;
      set({ selectedProvider: validProvider || "ollama", isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  setProvider: async (config) => {
    try {
      if (config.provider === "ollama") {
        await window.electronAPI.setSecureStorage(`provider::${config.provider}`, JSON.stringify({ model: config.model }));
      }

      if (config.provider === "openaiCompatible") {
        await window.electronAPI.setSecureStorage(
          `provider::${config.provider}`,
          JSON.stringify({ model: config.model, baseUrl: config.baseUrl, apiKey: config.apiKey }),
        );
      }

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
