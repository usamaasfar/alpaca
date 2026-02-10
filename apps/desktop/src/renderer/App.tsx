import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { useMCPReconnect } from "~/renderer/hooks/use-mcp-reconnect";
import ComposerScreen from "~/renderer/screens/composer";
import SettingsScreen from "~/renderer/screens/settings";

const App = () => {
  const [showSettings, setShowSettings] = useState(false);

  // Handle MCP server reconnection status
  useMCPReconnect();

  // Global shortcuts (Cmd+K, Escape for settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K: Toggle settings
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setShowSettings((prev) => !prev);
      }
      // Escape: Close settings
      if (e.key === "Escape" && showSettings) {
        e.preventDefault();
        setShowSettings(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings]);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <div className="fixed inset-x-0 top-0 h-8 app-drag-region z-50" aria-hidden="true" />
      {showSettings ? <SettingsScreen /> : <ComposerScreen showSettings={showSettings} />}
      <Toaster position="top-right" />
    </main>
  );
};

export default App;
