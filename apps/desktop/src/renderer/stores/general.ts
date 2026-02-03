import { create } from "zustand";

interface GeneralSettingsStore {
  isLoading: boolean;
  username: string;
  customInstructions: string;

  setGeneralSetting: (generalSettings: { username: string; customInstructions: string }) => Promise<void>;
  getGeneralSettings: () => Promise<void>;
}

export const useGeneralSettingsStore = create<GeneralSettingsStore>((set) => ({
  isLoading: false,
  username: "",
  customInstructions: "",

  setGeneralSetting: async (generalSettings) => {
    try {
      await window.electronAPI.setSettings(generalSettings);
      set({ ...generalSettings });
    } catch (error) {
      console.error(error);
    }
  },

  getGeneralSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await window.electronAPI.getSettings();
      set({ ...settings, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },
}));
