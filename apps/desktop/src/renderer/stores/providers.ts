import { create } from "zustand";

export interface ProviderConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
}

interface ProvidersSettingsStore {
  isLoading: boolean;
  config?: ProviderConfig;
  loadConfig: () => Promise<void>;
  saveConfig: (config: ProviderConfig) => Promise<void>;
}

export const useProvidersSettingsStore = create<ProvidersSettingsStore>((set) => ({
  isLoading: false,
  config: undefined,

  loadConfig: async () => {
    set({ isLoading: true });

    try {
      const configJson = await window.electronAPI.getStorage("provider::config");

      if (!configJson) {
        set({ config: undefined, isLoading: false });
        return;
      }

      const parsedConfig = JSON.parse(configJson as string) as Partial<ProviderConfig>;
      set({
        config: {
          model: parsedConfig.model || "",
          baseUrl: parsedConfig.baseUrl || "",
          apiKey: parsedConfig.apiKey || "",
        },
        isLoading: false,
      });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  saveConfig: async (config) => {
    try {
      const serialized = JSON.stringify({
        model: config.model,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey || "",
      });

      await window.electronAPI.setStorage("provider::config", serialized);
      set({ config });
    } catch (error) {
      console.error(error);
    }
  },
}));
