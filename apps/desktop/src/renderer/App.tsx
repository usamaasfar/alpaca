import { useEffect } from "react";

import ComposerScreen from "~/renderer/screens/composer";
import SettingsScreen from "~/renderer/screens/settings";
import { useSettingsStore } from "~/renderer/stores/settings";

const App = () => {
  const { loadSettings, loadProviders, checkOllamaHealth } = useSettingsStore();

  useEffect(() => {
    const initializeApp = async () => {
      await Promise.all([loadSettings(), loadProviders(), checkOllamaHealth()]);
    };

    initializeApp();
  }, [loadSettings, loadProviders, checkOllamaHealth]);

  return (
    <main className="h-screen w-screen ">
      <SettingsScreen />
    </main>
  );
};

export default App;
