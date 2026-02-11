import { create } from "zustand";

export interface ProviderConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
}

interface ProvidersSettingsStore {
  isLoading: boolean;
  config?: ProviderConfig;
  getProvider: () => Promise<void>;
  setProvider: (config: ProviderConfig) => Promise<void>;
}

export const useProvidersSettingsStore = create<ProvidersSettingsStore>((set) => ({
  isLoading: false,
  config: undefined,

  getProvider: async () => {
    set({ isLoading: true });

    try {
      const configJson = await window.electronAPI.getStorage("provider::config");
      if (!configJson) return set({ config: undefined, isLoading: false });

      const parsedConfig = JSON.parse(configJson as string) as Partial<ProviderConfig>;
      set({ config: { model: parsedConfig.model, baseUrl: parsedConfig.baseUrl, apiKey: parsedConfig.apiKey }, isLoading: false });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  setProvider: async (config) => {
    try {
      const serialized = JSON.stringify({ model: config.model, baseUrl: config.baseUrl, apiKey: config.apiKey });
      await window.electronAPI.setStorage("provider::config", serialized);
      set({ config });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
}));

// Auto-initialize on store creation
useProvidersSettingsStore.getState().getProvider();
